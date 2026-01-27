"use client"

import { useState, useEffect, useRef } from "react"

interface CreateLeagueModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: any) => void
  onDelete?: () => void
  events: any[]
  isNew: boolean
  league?: any
}

function parseAsET(dt: string) {
  const [datePart, timePart] = dt.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hour, minute] = timePart.split(":").map(Number)

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess)

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0"

  const etYear = Number(get("year"))
  const etMonth = Number(get("month"))
  const etDay = Number(get("day"))
  const etHour = Number(get("hour"))
  const etMinute = Number(get("minute"))
  const etSecond = Number(get("second"))

  const etWallAsUtc = Date.UTC(etYear, etMonth - 1, etDay, etHour, etMinute, etSecond)
  const offsetMs = etWallAsUtc - utcGuess.getTime()

  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMs)
}

function toInputET(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"

  const year = get("year")
  const month = get("month")
  const day = get("day")
  const hour = get("hour")
  const minute = get("minute")

  return `${year}-${month}-${day}T${hour}:${minute}`
}

export default function CreateLeagueModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  events,
  isNew,
  league,
}: CreateLeagueModalProps) {
  const [eventId, setEventId] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [draftDate, setDraftDate] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [usernames, setUsernames] = useState("")
  const [errors, setErrors] = useState<string[]>([])
  const [maxUsers, setMaxUsers] = useState<number>(0)
  const modalRef = useRef<HTMLDivElement | null>(null)

  const selectedEvent = events.find((ev) => String(ev.id) === String(eventId))
  const maxAllowedUsers = selectedEvent?.num_teams ?? 2
  const currentEnrolled = !isNew ? (league?.fantasy_event_users?.length ?? 0) : 0
  const minAllowedUsers = isNew ? 2 : Math.max(2, currentEnrolled)

  useEffect(() => {
    if (!isNew && league) {
      setEventId(league.curling_event_id)
      setName(league.name)
      setDescription(league.description || "")
      setDraftDate(toInputET(new Date(league.draft_date)))
      setIsPublic(league.is_public)
      setUsernames("")
      setMaxUsers(league.max_users ?? 2)
      return
    }

    if (isNew) {
      setEventId("")
      setName("")
      setDescription("")
      setDraftDate("")
      setIsPublic(true)
      setUsernames("")
      setMaxUsers(2)
    }
  }, [isNew, league])

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!selectedEvent) return

    setMaxUsers((prev) =>
      Math.min(Math.max(prev, minAllowedUsers), selectedEvent.num_teams)
    )
  }, [eventId, minAllowedUsers, selectedEvent])

  if (!isOpen) return null

  const handleSubmit = () => {
    const newErrors: string[] = []

    if (!name.trim()) newErrors.push("Please enter a league name.")
    if (!draftDate) newErrors.push("Please choose a draft date.")

    const selectedEvent = events.find((ev) => String(ev.id) === String(eventId))
    
    if (!selectedEvent) {
      newErrors.push("Please select an event.")
    } else {
      if (maxUsers < 2 || maxUsers > selectedEvent.num_teams) {
        newErrors.push(
          `Number of participants must be between 2 and ${selectedEvent.num_teams}.`
        )
      }
    }

    if (!isNew && maxUsers < currentEnrolled) {
      newErrors.push(
        `Max participants cannot be less than the ${currentEnrolled} participants already joined.`
      )
    }

    if (selectedEvent && draftDate) {
      const draftInstant = parseAsET(draftDate)
      const nowInstant = new Date()

      const startInstant = parseAsET(`${selectedEvent.start_date}T00:00`)

      if (draftInstant.getTime() >= startInstant.getTime()) {
        newErrors.push("Draft date must be before the event start date.")
      }

      if (draftInstant.getTime() < nowInstant.getTime()) {
        newErrors.push("Draft date cannot be in the past.")
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors([])

    const draftETForSave = parseAsET(draftDate).toISOString()

    onSubmit({
      eventId,
      name,
      description,
      draftDate: draftETForSave,
      isPublic,
      usernames,
      maxUsers,
    })
  }

  const futureEvents = events.filter((ev) => {
    const startInstant = parseAsET(`${ev.start_date}T00:00`)
    return startInstant.getTime() > Date.now()
  })

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="
          relative bg-white rounded-lg shadow-xl
          w-full max-w-lg
          mx-3 sm:mx-0
          p-3 sm:p-6
          max-h-[90vh] overflow-y-auto
        "
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {/* close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>

          <h2 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4">
            {isNew ? "Be Your Own Draw Master" : "Edit League Details"}
          </h2>

          {errors.length > 0 && (
            <div className="mb-4 bg-red-100 text-red-700 p-3 rounded">
                <ul className="list-disc ml-5 text-xs sm:text-sm">
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* visibility toggle */}
          <div className="flex items-center gap-1 text-xs mb-3 sm:mb-0 sm:absolute sm:top-8 sm:right-8">
            {isNew ? (
              <>
                <span className="text-xs text-gray-500">Private</span>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-10 h-5 rounded-full relative transition ${
                    isPublic ? "bg-blue-500" : "bg-gray-400"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition ${
                      isPublic ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500">Public</span>
              </>
            ) : (
              <span className="text-[10px] text-gray-400 italic">
                Visibility locked after creation
              </span>
            )}
          </div>

          {/* event select / event label */}
          {isNew ? (
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full border px-2 py-1.5 sm:p-2 rounded b-3"
            >
              <option value="">Select Event</option>
              {futureEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.year} {ev.name} in {ev.location}
                </option>
              ))}
            </select>
          ) : (
            <div className="mb-3">
              <div className="p-2 text-lg rounded text-gray-700">
                {(() => {
                  const ev = events.find((e) => String(e.id) === String(eventId))
                  return ev ? `${ev.year} ${ev.name} in ${ev.location}` : "Unknown Event"
                })()}
              </div>
            </div>
          )}

          <input
            type="text"
            placeholder="League Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border px-2 py-1.5 sm:p-2 rounded mb-3"
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border px-2 py-1.5 sm:p-2 rounded mb-1"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Draft Date <span className="text-gray-500 text-xs italic">(ET)</span>
              </label>
              <input
                type="datetime-local"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="w-full border px-2 py-1.5 sm:p-2 rounded"
              />
            </div>

            <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Max Participants
                {selectedEvent && (
                  <span className="text-xs text-gray-500 ml-1">
                    ({minAllowedUsers}–{selectedEvent.num_teams})
                  </span>
                )}
              </label>
              <input
                type="number"
                min={minAllowedUsers}
                max={maxAllowedUsers}
                value={maxUsers}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setMaxUsers(Math.min(Math.max(v, minAllowedUsers), maxAllowedUsers))
                }}
                className="w-full border px-2 py-1.5 sm:p-2 rounded"
                disabled={!selectedEvent}
              />
            </div>
          </div>

          {!isPublic && (
            <textarea
              placeholder="Invite participants by entering their usernames (comma-separated)"
              value={usernames}
              onChange={(e) => setUsernames(e.target.value)}
              className="w-full border px-2 py-1.5 sm:p-2 rounded mb-3"
            />
          )}

          {/* actions */}
          <button
            type="submit"
            className="w-full bg-[#234C6A] hover:bg-[#1B3C53] text-white py-2 rounded-md transition-colors"
          >
            {isNew ? "Create League" : "Save Changes"}
          </button>

          {!isNew && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onDelete}
                className="text-sm text-red-700 hover:text-red-900 hover:underline"
              >
                Delete League
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
