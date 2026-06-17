"""add email + first/last name to users

Revision ID: 0002_user_email_name
Revises: 0001_initial
Create Date: 2026-06-03

Idempotent: 0001 runs Base.metadata.create_all(), which on a FRESH database already
creates the current schema (including these columns). The guards make this a no-op in
that case, while still applying on databases created before these columns existed.
"""
import sqlalchemy as sa
from alembic import op

revision = "0002_user_email_name"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    cols = {c["name"] for c in insp.get_columns("users")}
    if "email" not in cols:
        op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    if "first_name" not in cols:
        op.add_column("users", sa.Column("first_name", sa.String(length=120), nullable=False, server_default=""))
    if "last_name" not in cols:
        op.add_column("users", sa.Column("last_name", sa.String(length=120), nullable=False, server_default=""))
    if "ix_users_email" not in {i["name"] for i in insp.get_indexes("users")}:
        op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("users", "email")
