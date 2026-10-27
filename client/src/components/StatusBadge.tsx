import type { Status } from '../../../shared/types';
import { STATUS_LABEL } from '../format';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge s-${status}`}>{STATUS_LABEL[status]}</span>;
}
