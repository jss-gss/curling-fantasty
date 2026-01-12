"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function NextMajorEvent() {
  const [event, setEvent] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0 })

  useEffect(() => {
    async function loadEvent() {
      const { data } = await supabase
        .from("curling_events")
        .select("*")
        .gt("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(1)

      if (data && data.length > 0) setEvent(data[0])
    }

    loadEvent()
  }, [])

  useEffect(() => {
    if (!event) return

    function update() {
      const now = new Date().getTime()
      const eventTime = new Date(event.start_date).getTime()
      const diff = eventTime - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0 })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      )

      setTimeLeft({ days, hours })
    }

    update()
    const interval = setInterval(update, 1000 * 60)
    return () => clearInterval(interval)
  }, [event])

  if (!event) return null

  return (
    <div className="bg-white shadow-md p-3 mt-4 w-full text-center rounded-lg">
      <h3 className="text-sm font-bold text-[#1f4785] mb-2">
        NEXT MAJOR EVENT
      </h3>

      <p className="text-xs text-gray-800 font-medium mb-3">
        {event.year} {event.name} in {event.location}
      </p>

      <div className="flex gap-3 justify-center">
        <div className="flex flex-col items-center">
          <div className="bg-gray-100 border border-gray-300 px-3 py-2 text-xl font-bold rounded-lg">
            {timeLeft.days}
          </div>
          <span className="text-[11px] text-gray-700 mt-1">days</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-gray-100 border border-gray-300 px-3 py-2 text-xl font-bold rounded-lg">
            {timeLeft.hours}
          </div>
          <span className="text-[11px] text-gray-700 mt-1">hours</span>
        </div>
      </div>
    </div>
  )
}
