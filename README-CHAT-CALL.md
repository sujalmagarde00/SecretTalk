# SecretTalk: Private Chat + Audio/Video Calling

This update changes the Home screen to a user finder and adds one-to-one messages, message history, audio calls and video calls.

## Requirements
- Java 21
- MySQL 8 with a database named `secretalk`
- Node.js/npm

## 1. Configure the database
Set environment variables before starting the backend. Do not commit your database password.

Windows PowerShell (current terminal only):
```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/secretalk"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="YOUR_MYSQL_PASSWORD"
```

The backend uses Hibernate `ddl-auto=update` to create the new `chat_messages` table.

## 2. Start backend
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
Backend: `http://localhost:8080`

## 3. Start frontend
Open another terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

## 4. Test with two users
1. Register two separate accounts in two browser profiles (or one normal browser and one incognito window).
2. Log in to each account.
3. Search for the other username on Home and press **Message / Call**.
4. Send messages; the chat history is saved in MySQL.
5. Press Audio or Video. The receiving user must have the chat open to receive the call in this initial version. Allow browser microphone/camera permissions.

## Notes and limitations
- The app uses a server-side HTTP session for login. Logout invalidates the session.
- WebSocket messages derive the sender from the authenticated session; the browser cannot choose another sender ID.
- WebRTC uses a public STUN server. Calls may fail on some NAT/firewall networks until you configure a TURN server. For deployment, use HTTPS/WSS, configure a TURN server, enable CSRF protection suitable for your session setup, and review rate limits and privacy requirements.
- The initial version routes incoming calls while the receiver has the matching chat open. Background/global incoming-call notifications and offline delivery are not included yet.

## New chat features
- WhatsApp-style home screen with recent conversations, chat partner name, last message, and time.
- Per-message disappearing-message setting: Off, After seen, 30 seconds, or custom duration in minutes (up to 30 days).
- Attachments up to 10 MB (images, audio/video, PDF, common documents, text, ZIP). Files are stored in the backend `uploads/` directory and download access requires a logged-in participant.
- Sender can delete an individual message for both open clients.

The backend uses Hibernate `ddl-auto=update` to add the new chat-message columns to the existing `secretalk` database. Back up your database before upgrading. Expiry cleanup runs in the backend every 5 seconds. Files are stored on the same machine as the backend; for a public deployment, configure persistent private storage and HTTPS. This project is a development version, not end-to-end encrypted.


## WhatsApp-style profile, notifications, presence and call history additions
- Profile editing: display name, bio and status message at `/profile/me`.
- Presence shows online while a user's authenticated WebSocket is connected and records last-seen time when the final connection closes.
- Browser notifications: click **Notifications** on Home and allow notifications in the browser. Incoming messages can notify from Home or an open chat.
- Message status: one check for sent and two checks when the recipient opens the chat/marks the message seen. Disappearing-after-seen messages still delete after being seen.
- Call history is shown in the profile page and auto-deletes based on the current caller's retention setting (1, 7, 30, 90 days or never).
- Call window floats over the still-visible chat; drag its header to move, resize from the corner, and use the zoom slider for video.

Build/testing note: the source was updated, but this environment could not complete dependency downloads, so frontend production build and Maven compilation were not verified. Please run the project locally and share any terminal error if one appears.

## Additional WhatsApp-style features
- Light/dark theme toggle (saved in this browser).
- Separate Call History page at `/calls`, with a retention preference for new call records.
- New-message popup and unread message count on the home page (browser notifications require permission).
- Long-press a conversation on touch devices, or right-click on desktop, to select chats and clear them from your account view. This does not delete the other participant's messages.
- Video calls default to Data Saver: 320x240-ish capture, up to 12–15 fps, and a target outgoing bitrate of 250 kbps. Turn it off for higher quality. Actual data use depends on the network, browser and device.
- Call history retention settings have been moved out of Profile into the dedicated Call History section.

As with the previous build, this source package has not been fully compiled or end-to-end tested in this environment. Run the backend and frontend locally and share any build error output for debugging.
