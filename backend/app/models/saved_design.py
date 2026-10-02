import uuid

from sqlalchemy import Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class SavedDesign(TimestampMixin, Base):
    """A design or wishlist item saved by an anonymous visitor. With no print fields it is a plain wishlist
    entry; with them it is a saved customizer design."""

    __tablename__ = "saved_designs"
    __table_args__ = (Index("ix_saved_designs_owner_key_created_at", "owner_key", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_key: Mapped[str] = mapped_column(String(64), nullable=False)
    shopify_product_handle: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str | None] = mapped_column(String(60))
    text: Mapped[str | None] = mapped_column(String(200))
    font: Mapped[str | None] = mapped_column(String(60))
    text_color: Mapped[str | None] = mapped_column(String(32))
    print_size: Mapped[str | None] = mapped_column(String(20))
    placement: Mapped[str | None] = mapped_column(String(40))
