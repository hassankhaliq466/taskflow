export const NAVIGATION_LOADING_EVENT = "taskflow:navigation-start";

export function startNavigationLoading() {
  window.dispatchEvent(new Event(NAVIGATION_LOADING_EVENT));
}
