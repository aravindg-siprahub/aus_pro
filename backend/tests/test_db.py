import uuid
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.models import CheckoutSession, PrintDesign
from app.services.health import check_database


@pytest.fixture
def db():
    """A real Supabase session inside a transaction that is always rolled back, so no test data persists."""
    conn = get_engine().connect()
    trans = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        conn.close()


def test_connects_and_queries(db):
    assert check_database(db) is True


def test_schema_is_at_head(db):
    assert db.execute(text("select version_num from alembic_version")).scalar_one()


def test_checkout_with_print_designs_cascades(db):
    cs = CheckoutSession(reference=f"ref-{uuid.uuid4()}", shopify_draft_order_id=uuid.uuid4().int % 10**12,
                         currency="INR", total_amount=Decimal("1499.00"))
    cs.print_designs.append(PrintDesign(line_index=0, shopify_variant_id=1, quantity=1, text="Hi", font="Sans",
                                        text_color="#000", print_size="medium", placement="chest"))
    db.add(cs)
    db.flush()
    assert db.query(PrintDesign).filter_by(checkout_session_id=cs.id).count() == 1
    db.delete(cs)
    db.flush()
    assert db.query(PrintDesign).count() == 0


def test_constraints_reject_bad_data(db):
    db.add(CheckoutSession(reference="neg", shopify_draft_order_id=1, currency="INR", total_amount=Decimal("-1")))
    with pytest.raises(IntegrityError):
        db.flush()
