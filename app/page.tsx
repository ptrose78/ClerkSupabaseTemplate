'use client'
import { useEffect, useState, useMemo } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export default function Home() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  // The `useUser()` hook ensures that Clerk has loaded data about the logged-in user
  const { user } = useUser()
  // The `useSession()` hook gets the Clerk session object
  const { session } = useSession()

  // Create a Supabase client using useMemo to ensure it only runs once per session change
  const client = useMemo(() => {
    if (!session) return null

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!,
      {
        global: {
          fetch: async (url, options = {}) => {
            const clerkToken = await session.getToken({
              template: 'supabase',
            })

            const headers = new Headers(options?.headers)
            headers.set('Authorization', `Bearer ${clerkToken}`)

            return fetch(url, {
              ...options,
              headers,
            })
          },
        },
      }
    )
  }, [session]) // Re-create the client only when `session` changes


  useEffect(() => {
    if (!user || !client) return

    async function loadTasks() {
      setLoading(true)
      const { data, error } = await client.from('tasks').select()
      if (!error) setTasks(data)
      setLoading(false)
    }

    loadTasks()
  }, [user, client]) // Ensure `client` is included so it waits for initialization

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!client) return

    await client.from('tasks').insert({
      name,
    })
    window.location.reload()
  }

  async function onCheckClicked(taskId: number, isDone: boolean) {
    if (!client) return

    await client
      .from('tasks')
      .update({
        is_done: isDone,
      })
      .eq('id', taskId)
    window.location.reload()
  }

  async function deleteTask(taskId: number) {
    if (!client) return

    await client.from('tasks').delete().eq('id', taskId)
    window.location.reload()
  }

  return (
    <div>
      <h1>Tasks</h1>

      {loading && <p>Loading...</p>}

      {!loading &&
        tasks.length > 0 &&
        tasks.map((task: any) => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={task.is_done}
              onChange={(e) => onCheckClicked(task.id, e.target.checked)}
            />
            <p>{task.name}</p>
            <button onClick={() => deleteTask(task.id)}>Delete</button>
          </div>
        ))}

      {!loading && tasks.length === 0 && <p>No tasks found</p>}

      <form onSubmit={createTask}>
        <input
          autoFocus
          type="text"
          name="name"
          placeholder="Enter new task"
          onChange={(e) => setName(e.target.value)}
          value={name}
        />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
