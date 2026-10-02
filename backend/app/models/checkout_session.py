import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, Enum, Index, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.print_design import PrintDesign


class CheckoutStatus(str, enum.Enum):
    awaiting_payment = "awaiting_payment"
    paid = "paid"
    cancelled = "cancelled"
    expired = "expired"


class CheckoutSession(TimestampMixin, Base):
    """Links our signed order reference to a Shopify draft order. Shopify stays the source of truth for
    the order itself; this row only remembers what we sent and where it is."""

    __tablename__ = "checkout_sessions"
    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="total_non_negative"),
        Index("ix_checkout_sessions_status_created_at", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    shopify_draft_order_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    shopify_order_id: Mapped[int | None] = mapped_column(BigInteger, unique=True)
    status: Mapped[CheckoutStatus] = mapped_column(
        Enum(CheckoutStatus, name="checkout_status"), default=CheckoutStatus.awaiting_payment, nullable=False
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    print_designs: Mapped[list["PrintDesign"]] = relationship(
        back_populates="checkout_session", cascade="all, delete-orphan", order_by="PrintDesign.line_index"
    )
