"""add health overrides and pm schedules

Revision ID: a1b2c3d4e5f6
Revises: 320a13fd9edc
Create Date: 2026-03-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '320a13fd9edc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('crane_health_overrides',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('crane_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('set_by', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['crane_id'], ['cranes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['set_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('crane_id'),
    )
    op.create_table('pm_schedules',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('crane_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('assigned_to', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['crane_id'], ['cranes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_pm_schedules_crane_id', 'pm_schedules', ['crane_id'])


def downgrade() -> None:
    op.drop_index('ix_pm_schedules_crane_id', table_name='pm_schedules')
    op.drop_table('pm_schedules')
    op.drop_table('crane_health_overrides')
