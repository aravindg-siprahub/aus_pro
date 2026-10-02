import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, Identity, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditEvent(str, enum.Enum):
    login_success = "login_success"
    login_failure = "login_failure"
    login_locked = "login_locked"
    logout = "logout"


class AdminAuditLog(Base):
    """Append-only record of admin sign-in activity. Never stores passwords or session tokens."""

    __tablename__ = "admin_audit_log"
    __table_args__ = (Index("ix_admin_audit_log_event_created_at", "event", "created_at"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    event: Mapped[AuditEvent] = mapped_column(Enum(AuditEvent, name="audit_event"), nullable=False)
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )
