"""publish state, ignored checks, real amendments, project history

Revision ID: 0003_collaboration
Revises: 0002_user_email_name
Create Date: 2026-06-03

Idempotent (see note in 0002): skips anything 0001's create_all already built on a
fresh database.
"""
import sqlalchemy as sa
from alembic import op

revision = "0003_collaboration"
down_revision = "0002_user_email_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())

    def cols(table):
        return {c["name"] for c in insp.get_columns(table)}

    def fk_cols(table):
        return {tuple(fk["constrained_columns"]) for fk in insp.get_foreign_keys(table)}

    project_cols = cols("projects")
    if "published_at" not in project_cols:
        op.add_column("projects", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    if "ignored_checks" not in project_cols:
        op.add_column("projects", sa.Column("ignored_checks", sa.Text(), nullable=False, server_default="[]"))

    amend_cols = cols("amendments")
    add = [
        ("target_article_id", sa.Column("target_article_id", sa.Integer(), nullable=True)),
        ("proposed_title", sa.Column("proposed_title", sa.Text(), nullable=False, server_default="")),
        ("proposed_alineate", sa.Column("proposed_alineate", sa.Text(), nullable=False, server_default="[]")),
        ("decided_by_id", sa.Column("decided_by_id", sa.Integer(), nullable=True)),
        ("decision_reason", sa.Column("decision_reason", sa.Text(), nullable=False, server_default="")),
        ("decided_at", sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True)),
    ]
    for name, col in add:
        if name not in amend_cols:
            op.add_column("amendments", col)

    existing_fks = fk_cols("amendments")
    if ("target_article_id",) not in existing_fks:
        op.create_foreign_key(
            "fk_amendments_target_article", "amendments", "articles", ["target_article_id"], ["id"], ondelete="SET NULL"
        )
    if ("decided_by_id",) not in existing_fks:
        op.create_foreign_key("fk_amendments_decided_by", "amendments", "users", ["decided_by_id"], ["id"])

    if not insp.has_table("project_events"):
        op.create_table(
            "project_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), index=True),
            sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("actor_name", sa.String(length=160), server_default=""),
            sa.Column("actor_initials", sa.String(length=8), server_default=""),
            sa.Column("kind", sa.String(length=40), nullable=False),
            sa.Column("summary", sa.Text(), server_default=""),
            sa.Column("diff", sa.Text(), server_default=""),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )


def downgrade() -> None:
    op.drop_table("project_events")
    op.drop_constraint("fk_amendments_decided_by", "amendments", type_="foreignkey")
    op.drop_constraint("fk_amendments_target_article", "amendments", type_="foreignkey")
    for col in ("decided_at", "decision_reason", "decided_by_id", "proposed_alineate", "proposed_title", "target_article_id"):
        op.drop_column("amendments", col)
    op.drop_column("projects", "ignored_checks")
    op.drop_column("projects", "published_at")
