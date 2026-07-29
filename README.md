# Real-Time Verification Portal

Enterprise-style React dashboard for managing a multi-step verification workflow through a live WebSocket stream.

## Features

- Persistent WebSocket connection to `wss://echo.websocket.events`
- Kanban-style workflow columns for Pending, In Progress, and Completed tickets
- Pending tickets can move into active review through `Start Review`
- Pending and In Progress tickets can dispatch Approve or Reject actions over WebSocket
- Incoming broadcasts update React state instantly without refresh
- Workflow state persists in browser localStorage after page refresh
- Functional state update pattern prevents stale closures
- Socket cleanup with `ws.close()` on component unmount
- Disabled action buttons when offline
- Exponential reconnect backoff: 1s, 2s, 4s, 8s, up to 16s
- Loading indicator during the initial connection phase
- Empty state when all tickets are completed
- Accessible semantic UI with ARIA labels
- Telemetry simulation through console analytics logs
- Secure title rendering through React text interpolation, with no `dangerouslySetInnerHTML`

## Tech Stack

- React 18
- Vite
- JavaScript
- WebSocket API
- Vanilla CSS

## Run Locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL shown by Vite, usually:

```txt
http://localhost:5173
```

## QA Commands

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

## Demo Flow

1. Open the dashboard.
2. Wait for the connection status to show `Connected`.
3. Click `Start Review` on a pending ticket and confirm it moves into In Progress.
4. Click `Approve` or `Reject` on an active ticket.
5. Confirm the ticket moves into the Completed column without page refresh.
6. Refresh the browser and confirm the changed ticket statuses are still visible.
7. Open DevTools Console and show:
   ```txt
   [Analytics] Task status mutated via WebSocket
   ```
6. Temporarily disable network to show offline buttons and reconnect behavior.

## Deployment

Deploy the project on Vercel.

Recommended settings:

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```
