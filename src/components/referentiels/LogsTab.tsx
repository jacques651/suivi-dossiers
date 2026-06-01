import { Log } from './types';
import LogsManager from './LogsManager';

interface LogsTabProps {
  logs: Log[];
  onRefresh: () => void;
}

export function LogsTab({  }: LogsTabProps) {
  return <LogsManager />;
}