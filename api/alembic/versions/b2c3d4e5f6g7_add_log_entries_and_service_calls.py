"""add log entries and service calls

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-03 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'log_entries',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('crane_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['crane_id'], ['cranes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_log_entries_crane_id', 'log_entries', ['crane_id'])

    op.create_table(
        'service_calls',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('crane_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('priority', sa.String(20), nullable=False, server_default='medium'),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('assigned_to', sa.String(255), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['crane_id'], ['cranes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_service_calls_crane_id', 'service_calls', ['crane_id'])


def downgrade() -> None:
    op.drop_index('ix_service_calls_crane_id', table_name='service_calls')
    op.drop_table('service_calls')
    op.drop_index('ix_log_entries_crane_id', table_name='log_entries')
    op.drop_table('log_entries')
