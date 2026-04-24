"""Add user_id columns for per-user data isolation.

Revision ID: a1b2c3d4e5f6
Revises: 82abdbc476a7
Create Date: 2026-04-24 01:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "82abdbc476a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user_id column to presentations
    op.add_column(
        "presentations",
        sa.Column("user_id", sa.String(), nullable=False, server_default=""),
    )
    op.create_index(op.f("ix_presentations_user_id"), "presentations", ["user_id"])

    # Add user_id column to imageasset
    op.add_column(
        "imageasset",
        sa.Column("user_id", sa.String(), nullable=False, server_default=""),
    )
    op.create_index(op.f("ix_imageasset_user_id"), "imageasset", ["user_id"])

    # Add user_id column to presentation_layout_codes
    op.add_column(
        "presentation_layout_codes",
        sa.Column("user_id", sa.String(), nullable=False, server_default=""),
    )
    op.create_index(
        op.f("ix_presentation_layout_codes_user_id"),
        "presentation_layout_codes",
        ["user_id"],
    )

    # Add user_id column to async_presentation_generation_tasks
    op.add_column(
        "async_presentation_generation_tasks",
        sa.Column("user_id", sa.String(), nullable=False, server_default=""),
    )
    op.create_index(
        op.f("ix_async_presentation_generation_tasks_user_id"),
        "async_presentation_generation_tasks",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_async_presentation_generation_tasks_user_id"),
        table_name="async_presentation_generation_tasks",
    )
    op.drop_column("async_presentation_generation_tasks", "user_id")

    op.drop_index(
        op.f("ix_presentation_layout_codes_user_id"),
        table_name="presentation_layout_codes",
    )
    op.drop_column("presentation_layout_codes", "user_id")

    op.drop_index(op.f("ix_imageasset_user_id"), table_name="imageasset")
    op.drop_column("imageasset", "user_id")

    op.drop_index(op.f("ix_presentations_user_id"), table_name="presentations")
    op.drop_column("presentations", "user_id")
