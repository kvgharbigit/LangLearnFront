# LanguageTutor Component Architecture

This document provides an overview of the LanguageTutor component architecture, which has been refactored for better maintainability, readability, and separation of concerns.

## Directory Structure

```
src/screens/LanguageTutor/
├── components/
│   ├── ConversationContainer.tsx   # Container for message list
│   ├── EmptyConversation.tsx       # Welcome screen when no conversation started
│   ├── RecordingButton.tsx         # Voice recording button
│   ├── RecordingStatus.tsx         # Status indicator during recording
│   └── index.ts                    # Exports all components
├── hooks/
│   ├── useAudioPlayer.ts           # Hook for audio playback functionality
│   ├── useAudioSettings.ts         # Hook for managing audio settings
│   └── index.ts                    # Exports all hooks
├── index.tsx                       # Main LanguageTutor component
└── README.md                       # Documentation
```

## Components

### Main Component
- **LanguageTutor (index.tsx)**: The main component that orchestrates the language tutor experience. It manages the conversation state, coordinates between components, and handles user interactions.

### UI Components
- **ConversationContainer**: Renders the list of messages in the conversation and handles scrolling behavior.
- **EmptyConversation**: Displays welcome information and a start button when no conversation has been started yet.
- **RecordingButton**: Circular button that changes appearance based on the current state (recording, processing, listening, etc.).
- **RecordingStatus**: Displays the current status during recording with appropriate styling and messaging.

## Hooks

- **useAudioPlayer**: Manages audio playback functionality, including loading audio, tracking playback status, and handling cleanup.
- **useAudioSettings**: Handles loading, saving, and updating audio settings with persistent storage.

## Features

The LanguageTutor component provides the following features:

- **Text and Voice Input**: Users can communicate with the language tutor using text input or voice recording.
- **Audio Playback**: Responses from the tutor are played as audio with adjustable playback speed.
- **Language Learning Settings**: Users can select target language, difficulty level, and conversation mode.
- **Auto-Recording**: Optional feature to automatically start recording after the tutor's response.
- **Auto-Send**: Optional feature to automatically send the recording when silence is detected.
- **Offline Mode**: Detects network connectivity issues and queues messages for later sending.
- **Visual Feedback**: Provides visual feedback during recording with status indicators and animations.

## Usage

The LanguageTutor component is used as the main screen for language learning sessions:

```jsx
import LanguageTutor from '../screens/LanguageTutor';

// In navigation
<Stack.Screen name="LanguageTutor" component={LanguageTutor} />
```

Navigation params:
- `targetLanguage`: The language the user wants to learn (e.g., 'es', 'fr')
- `nativeLanguage`: The user's native language (e.g., 'en')
- `difficulty`: Difficulty level ('beginner', 'intermediate', 'advanced')
- `learningObjective`: Optional objective for the learning session
- `conversationMode`: Mode of conversation ('language_lesson', 'free_conversation', etc.)

## Implementation Details

1. **State Management**: The LanguageTutor component maintains state for the conversation, recording status, and UI interactions.

2. **API Communication**: The component sends and receives messages through API calls, handling errors and offline scenarios.

3. **Audio Handling**: Audio playback and recording are managed through custom hooks that abstract the complexities of audio APIs.

4. **Responsive Design**: The UI adjusts for different device sizes and keyboard visibility.

5. **Performance Optimization**: Components are optimized to minimize re-renders and manage resources efficiently.

## Extending

To extend the LanguageTutor component:

1. **Add New UI Components**: Create new components in the `components/` directory and export them from `index.ts`.

2. **Add New Hooks**: Create custom hooks in the `hooks/` directory to abstract complex logic.

3. **Modify Existing Components**: Update existing components to add new features or improve the user experience.

4. **Update Main Component**: Modify the main `index.tsx` file to integrate new components and hooks.

## Testing

Components can be tested individually using unit tests or as part of integration tests that simulate user interactions.

---

By breaking down the complex LanguageTutor screen into smaller, focused components and hooks, the codebase becomes more maintainable, easier to understand, and simpler to extend with new features.