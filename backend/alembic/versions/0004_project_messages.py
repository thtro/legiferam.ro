"""live project chat messages

Revision ID: 0004_project_messages
Revises: 0003_collaboration
Create Date: 2026-06-03
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_project_messages"
down_revision = "0003_collaboration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("author_name", sa.String(length=160), server_default=""),
        sa.Column("author_initials", sa.String(length=8), server_default=""),
        sa.Column("body", sa.Text(), server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("project_messages")
