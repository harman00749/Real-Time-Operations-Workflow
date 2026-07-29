import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  completedStatuses,
  getColumnStatus,
  getReconnectDelay,
  isSocketOpen,
  parseSocketMessage,
} from '../utils/workflow.js';

const PRIMARY_SOCKET_URL = 'wss://ws.postman-echo.com/raw';
const FALLBACK_SOCKET_URL = 'wss://echo.websocket.events';
const SOCKET_URLS = [PRIMARY_SOCKET_URL, FALLBACK_SOCKET_URL];
const STORAGE_KEY = 'real-time-operations-workflow-tasks';

const initialTasks = [
  { id: 1, title: 'Identity document verification', status: 'PENDING' },
  { id: 2, title: 'Field address confirmation', status: 'PENDING' },
  { id: 3, title: 'Supervisor quality review', status: 'IN_PROGRESS' },
  { id: 4, title: 'Risk profile attestation', status: 'PENDING' },
  { id: 5, title: '<script>alert("blocked")</script> evidence check', status: 'IN_PROGRESS' },
];

const columns = [
  { key: 'PENDING', title: 'Pending' },
  { key: 'IN_PROGRESS', title: 'In Progress' },
  { key: 'COMPLETED', title: 'Completed' },
];

function readStoredTasks() {
  try {
    const storedTasks = window.localStorage.getItem(STORAGE_KEY);
    const parsedTasks = storedTasks ? JSON.parse(storedTasks) : null;

    if (!Array.isArray(parsedTasks)) {
      return initialTasks;
    }

    return initialTasks.map((defaultTask) => {
      const storedTask = parsedTasks.find((task) => task.id === defaultTask.id);
      return storedTask?.status ? { ...defaultTask, status: storedTask.status } : defaultTask;
    });
  } catch {
    return initialTasks;
  }
}

export default function WorkflowEngine() {
  const [tasks, setTasks] = useState(readStoredTasks);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const unmountedRef = useRef(false);
  const attemptRef = useRef(0);

  const connectSocket = useCallback((urlIndex = 0) => {
    setConnectionStatus('CONNECTING');

    const socket = new WebSocket(SOCKET_URLS[urlIndex]);
    socketRef.current = socket;

    socket.onopen = () => {
      attemptRef.current = 0;
      setReconnectAttempt(0);
      setConnectionStatus('CONNECTED');
      socket.send(JSON.stringify({ type: 'JOIN_ROOM', room: 'operations-room' }));
    };

    socket.onmessage = (event) => {
      const payload = parseSocketMessage(event.data);

      if (!payload) {
        return;
      }

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === payload.taskId ? { ...task, status: payload.newStatus } : task,
        ),
      );

      console.info('[Analytics] Task status mutated via WebSocket', payload);
    };

    socket.onerror = () => {
      setConnectionStatus('OFFLINE');
    };

    socket.onclose = () => {
      if (unmountedRef.current) {
        return;
      }

      setConnectionStatus('OFFLINE');
      const delay = getReconnectDelay(attemptRef.current);
      attemptRef.current += 1;
      setReconnectAttempt(attemptRef.current);

      const nextUrlIndex = (urlIndex + 1) % SOCKET_URLS.length;

      reconnectTimerRef.current = window.setTimeout(() => {
        connectSocket(nextUrlIndex);
      }, delay);
    };
  }, []);

  useEffect(() => {
    connectSocket();

    return () => {
      unmountedRef.current = true;
      window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [connectSocket]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const connected = connectionStatus === 'CONNECTED' && isSocketOpen(socketRef.current);
  const actionDisabled = !connected;

  const groupedTasks = useMemo(
    () =>
      columns.reduce((result, column) => {
        result[column.key] = tasks.filter((task) => getColumnStatus(task.status) === column.key);
        return result;
      }, {}),
    [tasks],
  );

  const activeTasksCount = useMemo(
    () => tasks.filter((task) => !completedStatuses.has(task.status)).length,
    [tasks],
  );

  const completedTasksCount = tasks.length - activeTasksCount;
  const progressPercent = Math.round((completedTasksCount / tasks.length) * 100);

  const sendStatusUpdate = useCallback((taskId, newStatus) => {
    const socket = socketRef.current;

    if (!isSocketOpen(socket)) {
      setConnectionStatus('OFFLINE');
      return;
    }

    socket.send(
      JSON.stringify({
        type: 'STATUS_UPDATE',
        taskId,
        newStatus,
      }),
    );
  }, []);

  return (
    <main className="portal-shell">
      <section className="hero-panel" aria-labelledby="portal-title">
        <div>
          <p className="eyebrow">ENG-149206 - Real-Time Operations</p>
          <h1 id="portal-title">Verification Workflow Engine</h1>
          <p className="hero-copy">
            Centralized operator dashboard for live ticket approvals, rejection flows, and
            WebSocket-driven status sync across the operations room.
          </p>
        </div>

        <aside className="control-panel" aria-label="Workflow summary">
          <div
            className={`connection-card ${connected ? 'is-online' : 'is-offline'}`}
            aria-live="polite"
          >
            <span className="status-dot" aria-hidden="true" />
            <div>
              <strong>{connectionStatus === 'CONNECTED' ? 'Connected' : connectionStatus}</strong>
              <span>
                {connectionStatus === 'CONNECTING'
                  ? 'Opening secure room stream...'
                  : connected
                    ? 'Operations room joined'
                    : `Offline - reconnect attempt ${reconnectAttempt}`}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="secondary-button reset-button"
            onClick={() => setTasks(initialTasks)}
            aria-label="Reset workflow back to default tickets"
          >
            Reset Workflow
          </button>
        </aside>
      </section>

      <section className="metrics-grid" aria-label="Workflow metrics">
        <article className="metric-card">
          <span>Total Tickets</span>
          <strong>{tasks.length}</strong>
        </article>
        <article className="metric-card">
          <span>Active Queue</span>
          <strong>{activeTasksCount}</strong>
        </article>
        <article className="metric-card">
          <span>Processed</span>
          <strong>{completedTasksCount}</strong>
        </article>
        <article className="metric-card metric-progress">
          <span>Completion</span>
          <strong>{progressPercent}%</strong>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </article>
      </section>

      {connectionStatus === 'CONNECTING' && (
        <div className="loading-strip" role="status" aria-live="polite">
          <span className="loader" aria-hidden="true" />
          Connecting to live workflow stream
        </div>
      )}

      {activeTasksCount === 0 && (
        <section className="empty-state" aria-label="All tasks completed">
          <div className="empty-illustration" aria-hidden="true">
            <span />
          </div>
          <div>
            <h2>All caught up!</h2>
            <p>Every verification ticket has been processed through the live workflow.</p>
          </div>
        </section>
      )}

      <section className="kanban-board" aria-label="Verification ticket workflow">
        {columns.map((column) => (
          <section className="workflow-column" key={column.key} aria-labelledby={`${column.key}-title`}>
            <header className="column-header">
              <h2 id={`${column.key}-title`}>{column.title}</h2>
              <span aria-label={`${groupedTasks[column.key].length} tickets`}>
                {groupedTasks[column.key].length}
              </span>
            </header>

            <ul className="task-list">
              {groupedTasks[column.key].map((task) => (
                <li key={task.id}>
                  <article className="task-card">
                    <div>
                      <p className="task-id">Ticket #{task.id}</p>
                      <h3>{task.title}</h3>
                      <span className={`status-pill status-${task.status.toLowerCase()}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    {!completedStatuses.has(task.status) && (
                      <div className="task-actions" title={actionDisabled ? 'Offline - Reconnecting...' : ''}>
                        {task.status === 'PENDING' && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => sendStatusUpdate(task.id, 'IN_PROGRESS')}
                            disabled={actionDisabled}
                            aria-label={`Move ticket ${task.id} into review: ${task.title}`}
                          >
                            Start Review
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => sendStatusUpdate(task.id, 'APPROVED')}
                          disabled={actionDisabled}
                          aria-label={`Approve ticket ${task.id}: ${task.title}`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => sendStatusUpdate(task.id, 'REJECTED')}
                          disabled={actionDisabled}
                          aria-label={`Reject ticket ${task.id}: ${task.title}`}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </article>
                </li>
              ))}

              {groupedTasks[column.key].length === 0 && (
                <li className="column-empty">No tickets in this lane</li>
              )}
            </ul>
          </section>
        ))}
      </section>
    </main>
  );
}
