"use client"

import { useCallback, useState } from "react"
import Cropper, { Area } from "react-easy-crop"

type Props = {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onSave: (file: File) => void
}

export default function AvatarCropModal({ open, imageSrc, onClose, onSave }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  if (!open || !imageSrc) return null

  async function handleSave() {
    if (!croppedAreaPixels || !imageSrc) return
    const file = await getCroppedImageAsFile(imageSrc, croppedAreaPixels, "profile.jpg")
    onSave(file)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#234C6A]">Crop Profile Photo</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>

        <div className="relative mt-3 h-80 w-full overflow-hidden rounded-md bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mt-4 hidden lg:block">
        <label className="text-sm text-gray-600">Zoom</label>

        <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
        />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-[#234C6A] px-4 py-2 text-white hover:bg-[#1B3C53]"
          >
            Use photo
          </button>
        </div>
      </div>
    </div>
  )
}

async function getCroppedImageAsFile(imageSrc: string, crop: Area, fileName: string) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No 2D context")

  canvas.width = crop.width
  canvas.height = crop.height

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  )

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas is empty"))
        resolve(new File([blob], fileName, { type: "image/jpeg" }))
      },
      "image/jpeg",
      0.9
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener("load", () => resolve(img))
    img.addEventListener("error", reject)
    img.crossOrigin = "anonymous"
    img.src = src
  })
}
