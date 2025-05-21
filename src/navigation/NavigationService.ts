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

/**
 * Services for navigation actions outside of React components
 */
export const NavigationService = {
  navigate,
  reset,
  goBack,
  getCurrentRoute,
  navigateByAuthState
};

export default NavigationService;