# e-Arzuhal – Mobile Frontend

**Mobile Programming Course Project**  
React Native / Expo Mobile Application


## Team Members

- **20230808619 – Enes Burak Atay**
- **20210808051 – Burak Dere**


## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.81.5 |
| Platform | Expo SDK 54 (managed workflow) |
| Navigation | React Navigation 7 (Stack + Bottom Tabs) |
| Fonts | DM Sans + Playfair Display (Google Fonts) |
| Secure Storage | expo-secure-store |


## Project Structure

```bash
frontend-mobile/
├── App.js
├── package.json
├── app.json
├── src/
│   ├── components/
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── Badge.js
│   │   ├── Header.js
│   │   ├── Input.js
│   │   ├── ProgressBar.js
│   │   ├── ScreenWrapper.js
│   │   ├── StepIndicator.js
│   │   ├── TextArea.js
│   │   └── DisclaimerModal.js
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── CreateContractScreen.js
│   │   ├── ContractsScreen.js
│   │   ├── ContractDetailScreen.js
│   │   ├── ApprovalsScreen.js
│   │   └── SettingsScreen.js
│   ├── services/
│   │   ├── api.service.js
│   │   ├── auth.service.js
│   │   └── contract.service.js
│   ├── config/
│   │   └── api.config.js
│   └── styles/
│       └── tokens.js
└── assets/
```

## Installation and Setup
To run the project locally:
```bash
cd mobile-programming-e-arzuhal
npm install
npx expo start
```
### Platform-Specific Commands

- **Android**
```bash
npx expo start --android
```

- **iOS**
```bash
npx expo start --ios
```
*(Requires macOS and Xcode)*

- **Expo Go**  
The application can be tested by scanning the generated QR code.


## Navigation Architecture

```bash
Stack.Navigator
├── Login
├── Register
└── Main → Tab.Navigator
    ├── Dashboard
    ├── CreateContract
    ├── Contracts → ContractsStack
    │   ├── ContractsList
    │   └── ContractDetail
    ├── Approvals
    └── Settings
```

The application uses a combination of **Stack Navigation** and **Bottom Tab Navigation** to separate authentication flows from the main application interface.


## ScreenWrapper Component Usage

The `ScreenWrapper` component ensures consistent safe area handling and background styling across all screens.

Example usage:

```javascript
return (
  <ScreenWrapper>
    <Header />
    <ScrollView>
      {/* Content */}
    </ScrollView>
  </ScreenWrapper>
);
```

This approach maintains layout consistency and improves UI maintainability.


## Backend Integration

The base server URL is configured in:

```
src/config/api.config.js
```

Example API usage:

```javascript
await api.post('/api/contracts', contractData);
await api.get('/api/contracts');
```

The application communicates with the backend using a centralized API service that manages authentication tokens and HTTP requests.


## Application Features

- User registration and authentication (JWT-based authentication)
- Contract creation
- Contract listing
- Contract detail viewing
- PDF download functionality
- Approval workflow management
- Legal disclaimer verification
- Automatic logout upon token expiration (401 handler)


## Legal Disclaimer Mechanism

After successful authentication, the system verifies whether the user has accepted the legal disclaimer.

The contract finalization process cannot be completed unless the disclaimer has been accepted. This mechanism ensures legal awareness and compliance within the system.


## Automatic Logout on Session Expiration

If any API request returns a `401 Unauthorized` response:

1. The authentication token is removed from SecureStore.
2. The authentication state is reset.
3. The user is redirected to the Login screen.

This ensures secure session management and prevents unauthorized access using expired tokens.
