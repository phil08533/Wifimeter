import { useState, useEffect, useCallback } from 'react'
import { deviceApi } from '../services/api'

export function useDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      const data = await deviceApi.list()
      setDevices(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [fetch])

  const updateDevice = useCallback(async (id, payload) => {
    const updated = await deviceApi.update(id, payload)
    setDevices(prev => prev.map(d => d.id === id ? updated : d))
    return updated
  }, [])

  const setLimit = useCallback(async (id, dl, ul) => {
    const updated = await deviceApi.setLimit(id, dl, ul)
    setDevices(prev => prev.map(d => d.id === id ? updated : d))
    return updated
  }, [])

  const setPriority = useCallback(async (id, priority) => {
    const updated = await deviceApi.setPriority(id, priority)
    setDevices(prev => prev.map(d => d.id === id ? updated : d))
    return updated
  }, [])

  return { devices, loading, error, refetch: fetch, updateDevice, setLimit, setPriority }
}
