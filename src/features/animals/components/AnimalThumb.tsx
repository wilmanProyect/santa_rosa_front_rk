import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Icon } from '@/shared/ui'
import { animalsKeys } from '../hooks/useAnimals'
import type { PrimaryPhoto, Species } from '../types/animal.types'

interface AnimalThumbProps {
  photo: PrimaryPhoto | null
  species: Species
  size?: 'sm' | 'lg'
}

/** Foto principal en miniatura, o un avatar genérico si el animal no tiene fotos. */
export function AnimalThumb({ photo, species, size = 'sm' }: AnimalThumbProps) {
  const queryClient = useQueryClient()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const url = photo?.thumbnailUrl
  const showImage = url && url !== failedUrl

  return (
    <span className={`animal-thumb animal-thumb--${size} animal-thumb--${species.toLowerCase()}`}>
      {showImage ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => {
            setFailedUrl(url)
            // Si la URL firmada venció, se pide el listado/ficha otra vez para tener una nueva.
            if (photo && Date.parse(photo.urlsExpireAt) <= Date.now()) {
              void queryClient.invalidateQueries({ queryKey: animalsKeys.all })
            }
          }}
        />
      ) : (
        <Icon name="animal" size={size === 'lg' ? 40 : 20} />
      )}
    </span>
  )
}
