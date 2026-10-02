import uuid
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.checkout_session import CheckoutSession


class PrintDesign(TimestampMixin, Base):
    """Customizer print data for one line of a checkout, kept for production independent of Shopify."""

    __tablename__ = "print_designs"
    __table_args__ = (
        UniqueConstraint("checkout_session_id", "line_index", name="uq_print_designs_session_line"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("line_index >= 0", name="line_index_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    checkout_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("checkout_sessions.id", ondelete="CASCADE"), nullable=False
    )
    line_index: Mapped[int] = mapped_column(Integer, nullable=False)
    shopify_variant_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(String(200), nullable=False)
    font: Mapped[str] = mapped_column(String(60), nullable=False)
    text_color: Mapped[str] = mapped_column(String(32), nullable=False)
    print_size: Mapped[str] = mapped_column(String(20), nullable=False)
    placement: Mapped[str] = mapped_column(String(40), nullable=False)

    checkout_session: Mapped["CheckoutSession"] = relationship(back_populates="print_designs")
