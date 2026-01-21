"use client";

import { useState, useEffect } from "react";

interface CreateLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void;
  onDelete?: () => void;
  events: any[];
  isNew: boolean;
  league?: any;
}

export default function CreateLeagueModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  events,
  isNew,
  league
}: CreateLeagueModalProps) {
  const [eventId, setEventId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [usernames, setUsernames] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isNew && league) {
      setEventId(league.curling_event_id);
      setName(league.name);
      setDescription(league.description || "");
      const localET = new Date(league.draft_date)
        .toLocaleString("sv-SE", { timeZone: "America/New_York" })
        .replace(" ", "T")
        .slice(0, 16);
      setDraftDate(localET);
      setIsPublic(league.is_public);
      setUsernames("");
    }
    if (isNew) {
      setEventId("");
      setName("");
      setDescription("");
      setDraftDate("");
      setIsPublic(true);
      setUsernames("");
    }
  }, [isNew, league]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const newErrors: string[] = [];

    if (!eventId) newErrors.push("Please select an event.");
    if (!name.trim()) newErrors.push("Please enter a league name.");
    if (!draftDate) newErrors.push("Please choose a draft date.");

    const selectedEvent = events.find((ev) => ev.id === eventId);

    if (selectedEvent && draftDate) {
      function parseETDateTime(dt: string) {
        const [datePart, timePart] = dt.split("T");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute] = timePart.split(":").map(Number);
        return new Date(Date.UTC(year, month - 1, day, hour + 5, minute));
      }

      function parseSupabaseDateAsET(dateString: string) {
        const [year, month, day] = dateString.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
      }

      const draft = parseETDateTime(draftDate);
      const start = parseSupabaseDateAsET(selectedEvent.start_date);
      const nowET = parseETDateTime(
        new Date().toLocaleString("sv-SE", { timeZone: "America/New_York" }).replace(" ", "T")
      );

      if (draft >= start) newErrors.push("Draft date must be before the event start date.");
      if (draft < nowET) newErrors.push("Draft date cannot be in the past.");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);

    onSubmit({
      eventId,
      name,
      description,
      draftDate,
      isPublic,
      usernames
    });
  };

  const futureEvents = events.filter(ev => new Date(ev.start_date) > new Date());

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white p-6 rounded-lg w-full max-w-lg shadow-xl">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold mb-4">
          {isNew ? "Be Your Own Draw Master" : "Edit League Details"}
        </h2>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4 bg-red-100 text-red-700 p-3 rounded">
            <ul className="list-disc ml-5 text-sm">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Public/Private Toggle */}
        <div className="absolute top-8 right-8 flex items-center gap-1">
          {isNew ? (
            <>
              <span className="text-xs text-gray-500">Private</span>

              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`w-10 h-5 rounded-full relative transition 
                  ${isPublic ? "bg-blue-500" : "bg-gray-400"}
                `}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition 
                    ${isPublic ? "translate-x-5" : ""}
                  `}
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

        {/* Event Dropdown */}
        {isNew ? (
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full border p-2 rounded mb-3"
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
                const ev = events.find((e) => e.id === eventId)
                return ev ? `${ev.year} ${ev.name} in ${ev.location}` : "Unknown Event"
              })()}
            </div>
          </div>
        )}

        {/* League Name */}
        <input
          type="text"
          placeholder="League Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        {/* Description */}
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        {/* Draft Date */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Draft Date <span className="text-gray-500 text-xs italic">in Eastern Time (ET)</span>
        </label>

        <input
          type="datetime-local"
          value={draftDate}
          onChange={(e) => setDraftDate(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        {/* Private Usernames */}
        {!isPublic && (
          <textarea
            placeholder="Invite players by entering their usernames (comma‑separated)"
            value={usernames}
            onChange={(e) => setUsernames(e.target.value)}
            className="w-full border p-2 rounded mb-3"
          />
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full bg-[#234C6A] hover:bg-[#1B3C53] text-white py-2 rounded-md transition-colors"
        >
          {isNew ? "Create League" : "Save Changes"}
        </button>

        {/* Delete League */}
        {!isNew && (
          <button
            onClick={onDelete}
            className="w-full bg-[#AA2B1D] hover:bg-[#8A1F15] text-white py-2 rounded-md mt-3 transition-colors"
          >
            Delete League
          </button>
        )}
      </div>
    </div>
  );
}
