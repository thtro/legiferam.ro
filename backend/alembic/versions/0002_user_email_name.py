"""add email + first/last name to users

Revision ID: 0002_user_email_name
Revises: 0001_initial
Create Date: 2026-06-03
"""
import sqlalchemy as sa
from alembic import op

revision = "0002_user_email_name"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("first_name", sa.String(length=120), nullable=False, server_default=""))
    op.add_column("users", sa.Column("last_name", sa.String(length=120), nullable=False, server_default=""))
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("users", "email")
