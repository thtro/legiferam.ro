"""publish state, ignored checks, real amendments, project history

Revision ID: 0003_collaboration
Revises: 0002_user_email_name
Create Date: 2026-06-03
"""
import sqlalchemy as sa
from alembic import op

revision = "0003_collaboration"
down_revision = "0002_user_email_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Project: publish state + ignored checks
    op.add_column("projects", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("projects", sa.Column("ignored_checks", sa.Text(), nullable=False, server_default="[]"))

    # Amendment: real-proposal fields
    op.add_column("amendments", sa.Column("target_article_id", sa.Integer(), nullable=True))
    op.add_column("amendments", sa.Column("proposed_title", sa.Text(), nullable=False, server_default=""))
    op.add_column("amendments", sa.Column("proposed_alineate", sa.Text(), nullable=False, server_default="[]"))
    op.add_column("amendments", sa.Column("decided_by_id", sa.Integer(), nullable=True))
    op.add_column("amendments", sa.Column("decision_reason", sa.Text(), nullable=False, server_default=""))
    op.add_column("amendments", sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        "fk_amendments_target_article", "amendments", "articles", ["target_article_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key("fk_amendments_decided_by", "amendments", "users", ["decided_by_id"], ["id"])

    # History log
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
