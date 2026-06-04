import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtime(channelName, config, handler) {
  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config, handler)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [channelName])
}
