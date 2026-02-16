import { useEffect, useRef } from 'react';
import { usePromptOS } from '../contexts/PromptOSContext';

export function useWindowEvents(onShow?: () => void, onHide?: () => void) {
  const promptOS = usePromptOS();
  
  // Store callbacks in refs to avoid re-subscription
  const onShowRef = useRef(onShow);
  const onHideRef = useRef(onHide);
  
  // Update refs when callbacks change
  useEffect(() => {
    onShowRef.current = onShow;
  }, [onShow]);
  
  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  // Subscribe once with stable listeners
  useEffect(() => {
    const showListener = () => onShowRef.current?.();
    const hideListener = () => onHideRef.current?.();
    
    const cleanupShow = onShow ? promptOS.onWindowShown(showListener) : undefined;
    const cleanupHide = onHide ? promptOS.onWindowHidden(hideListener) : undefined;

    return () => {
      cleanupShow?.();
      cleanupHide?.();
    };
  }, [promptOS]); // Only re-subscribe if promptOS changes
}
