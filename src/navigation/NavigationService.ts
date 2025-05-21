// NavigationService.ts
import { createRef } from 'react';
import { NavigationContainerRef, CommonActions } from '@react-navigation/native';

// Create a navigation reference that can be used outside of components
export const navigationRef = createRef<NavigationContainerRef<any>>();

/**
 * Navigate to a specific route
 * @param name Route name
 * @param params Route params
 */
function navigate(name: string, params?: any) {
  if (navigationRef.current) {
    // Check if we can navigate to the route
    const state = navigationRef.current.getState();
    const canNavigate = navigationRef.current.getRootState().routeNames.includes(name);
    
    if (canNavigate) {
      navigationRef.current.navigate(name, params);
    } else {
      console.warn(`Cannot navigate to route "${name}" - it may not be in the current navigator`);
    }
  } else {
    // Navigation ref not ready yet
    console.warn('Navigation attempted before navigationRef was ready');
  }
}

/**
 * Reset the navigation state to a new state
 * @param routes Array of route objects
 * @param index Index of the active route
 */
function reset(routes: { name: string; params?: any }[], index = 0) {
  if (navigationRef.current) {
    navigationRef.current.dispatch(
      CommonActions.reset({
        index,
        routes,
      })
    );
  } else {
    console.warn('Navigation reset attempted before navigationRef was ready');
  }
}

/**
 * Go back to the previous screen
 */
function goBack() {
  if (navigationRef.current) {
    navigationRef.current.goBack();
  } else {
    console.warn('Navigation goBack attempted before navigationRef was ready');
  }
}

/**
 * Returns the current route name
 */
function getCurrentRoute() {
  if (navigationRef.current) {
    return navigationRef.current.getCurrentRoute()?.name;
  }
  return null;
}

/**
 * Navigate after authentication state change
 * This handles the tricky case of navigating between Auth and Main stacks
 */
function navigateByAuthState(isAuthenticated: boolean) {
  if (navigationRef.current) {
    const rootState = navigationRef.current.getRootState();
    const currentRootRoute = rootState.routes[rootState.index].name;
    
    // If we're already on the correct stack, no need to navigate
    if ((isAuthenticated && currentRootRoute === 'Main') || 
        (!isAuthenticated && currentRootRoute === 'Auth')) {
      return;
    }
    
    // Reset to the appropriate stack
    reset([{ name: isAuthenticated ? 'Main' : 'Auth' }]);
  }
}

// Track navigation attempts in progress to prevent multiple simultaneous navigations
let navigationInProgress = false;

/**
 * Navigate to a modal screen in the root navigator
 * This is especially useful for components deep in the navigation tree
 */
function navigateToModal(name: string, params?: any) {
  console.log(`NavigationService: Attempting to navigate to modal screen ${name}`);
  
  // Prevent multiple simultaneous navigation attempts
  if (navigationInProgress) {
    console.warn('Navigation already in progress, ignoring new request');
    return false;
  }
  
  navigationInProgress = true;
  
  // Function to handle navigation with retry
  const attemptNavigation = (retryCount = 0) => {
    if (navigationRef.current) {
      console.log(`NavigationService: Navigating to modal screen ${name}`);
      // Direct navigation to the modal screen in the root navigator
      navigationRef.current.navigate(name, params);
      navigationInProgress = false;
      return true;
    } else {
      console.warn(`Navigation ref not ready for modal navigation (attempt ${retryCount+1})`);
      
      // Retry with increasing delays if we haven't exceeded max retries
      if (retryCount < 5) {
        const delay = 300 * (retryCount + 1); // Progressively longer delays
        console.log(`Will retry navigation in ${delay}ms`);
        
        setTimeout(() => {
          attemptNavigation(retryCount + 1);
        }, delay);
      } else {
        console.error('Failed to navigate after multiple attempts');
        navigationInProgress = false;
      }
      return false;
    }
  };
  
  // Start the navigation attempt
  return attemptNavigation();
}

/**
 * Services for navigation actions outside of React components
 */
export const NavigationService = {
  navigate,
  reset,
  goBack,
  getCurrentRoute,
  navigateByAuthState,
  navigateToModal
};

export default NavigationService;