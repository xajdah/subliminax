import type { CollageLayout } from '../../types/visionBoard'

interface Props {
  images: string[]
  layout: CollageLayout
  className?: string
}

function Tile({ src, className = '' }: { src: string; className?: string }) {
  return (
    <div className={`vision-tile relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover transition duration-500 ease-out group-hover/tile:scale-105"
        draggable={false}
      />
    </div>
  )
}

/** Smart auto-collage: adapts grid by image count + chosen layout. */
export function VisionCollage({ images, layout, className = '' }: Props) {
  const imgs = images.slice(0, 9)
  const n = imgs.length
  if (n === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-[color-mix(in_oklab,var(--accent-2)_8%,var(--bg))] ${className}`}
      >
        <span className="text-sm text-muted">Add images to shape this vision</span>
      </div>
    )
  }

  // Force layout by count when fewer images than layout expects
  const effective: CollageLayout =
    n === 1 ? 'single' : n === 2 ? (layout === 'single' ? 'split' : layout === 'split' ? 'split' : 'split') : layout

  if (n === 1 || effective === 'single') {
    return (
      <div className={`group/tile relative ${className}`}>
        <Tile src={imgs[0]!} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[color-mix(in_oklab,var(--bg)_75%,transparent)] via-transparent to-transparent" />
      </div>
    )
  }

  if (n === 2 || effective === 'split') {
    return (
      <div className={`grid h-full grid-cols-2 gap-1 ${className}`} style={{ gap: 4 }}>
        <div className="group/tile relative min-h-0">
          <Tile src={imgs[0]!} className="absolute inset-0" />
        </div>
        <div className="group/tile relative min-h-0">
          <Tile src={imgs[1]!} className="absolute inset-0" />
        </div>
      </div>
    )
  }

  if (n === 3 || effective === 'grid-3') {
    return (
      <div className={`grid h-full grid-cols-5 gap-1 ${className}`} style={{ gap: 4 }}>
        <div className="group/tile relative col-span-3 min-h-0">
          <Tile src={imgs[0]!} className="absolute inset-0" />
        </div>
        <div className="col-span-2 grid min-h-0 grid-rows-2" style={{ gap: 4 }}>
          <div className="group/tile relative min-h-0">
            <Tile src={imgs[1]!} className="absolute inset-0" />
          </div>
          <div className="group/tile relative min-h-0">
            <Tile src={imgs[2]!} className="absolute inset-0" />
          </div>
        </div>
      </div>
    )
  }

  if (effective === 'mosaic-4') {
    const show = imgs.slice(0, Math.min(9, Math.max(4, n)))
    return (
      <div className={`relative grid h-full grid-cols-4 grid-rows-2 ${className}`} style={{ gap: 4 }}>
        <div className="group/tile relative col-span-2 row-span-2 min-h-0">
          <Tile src={show[0]!} className="absolute inset-0" />
        </div>
        {show.slice(1, 5).map((src, i) => (
          <div key={i} className="group/tile relative min-h-0">
            <Tile src={src} className="absolute inset-0" />
          </div>
        ))}
        {n > 5 && (
          <span className="vision-count-badge absolute bottom-2 right-2">+{n - 5} more</span>
        )}
      </div>
    )
  }

  // bento-6 — up to 9 cells with featured first tile
  const show = imgs.slice(0, 9)
  return (
    <div className={`relative grid h-full grid-cols-6 grid-rows-3 ${className}`} style={{ gap: 4 }}>
      <div className="group/tile relative col-span-3 row-span-2 min-h-0">
        <Tile src={show[0]!} className="absolute inset-0" />
      </div>
      <div className="group/tile relative col-span-3 row-span-1 min-h-0">
        <Tile src={show[1] ?? show[0]!} className="absolute inset-0" />
      </div>
      <div className="group/tile relative col-span-2 row-span-1 min-h-0">
        <Tile src={show[2] ?? show[0]!} className="absolute inset-0" />
      </div>
      <div className="group/tile relative col-span-1 row-span-1 min-h-0">
        <Tile src={show[3] ?? show[0]!} className="absolute inset-0" />
      </div>
      {show.slice(4, 9).map((src, i) => (
        <div key={i} className="group/tile relative col-span-1 row-span-1 min-h-0">
          <Tile src={src} className="absolute inset-0" />
        </div>
      ))}
      {n > 6 && (
        <span className="vision-count-badge absolute bottom-2 right-2">{n} images</span>
      )}
    </div>
  )
}
