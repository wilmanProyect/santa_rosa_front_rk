import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/features/auth'
import { PERMISSIONS } from '@/shared/config/permissions'
import { formatDate } from '@/shared/lib/format'
import { Badge, Icon } from '@/shared/ui'
import { animalLabel } from '../lib/animal-label'
import { geneticCategoryShort } from '../lib/genetic-category'
import { repeatColor as colorFor } from '../lib/pedigree'
import { ANIMALS_ROUTES } from '../routes'
import {
  GENERATION_LABELS,
  GENETIC_CATEGORY_LABELS,
  PEDIGREE_MAX_GENERATIONS,
  type Pedigree,
  type PedigreeTreeNode,
} from '../types/animal.types'


interface PedigreeTreeProps {
  pedigree: Pedigree
  /** Pide una generación más (flecha "…" de la última columna). */
  onExpand(): void
}

/**
 * Árbol horizontal: el animal a la izquierda y cada generación en una columna hacia la
 * derecha, con la madre arriba y el padre abajo.
 */
export function PedigreeTree({ pedigree, onExpand }: PedigreeTreeProps) {
  const { can } = useAuth()
  const repeatColor = new Map(pedigree.repeatedAncestors.map((a, i) => [a.id, colorFor(i)] as const))
  const ctx: TreeContext = {
    lastGeneration: pedigree.generations,
    canExpand: pedigree.generations < PEDIGREE_MAX_GENERATIONS,
    canEdit: can(PERMISSIONS.ANIMALS_UPDATE),
    repeatColor,
    onExpand,
  }

  return (
    <div className="pedigree-scroll">
      <div className="pedigree" style={{ '--pedigree-cols': pedigree.generations + 1 } as CSSProperties}>
        <div className="pedigree__headers" aria-hidden="true">
          {Array.from({ length: pedigree.generations + 1 }, (_, g) => (
            <span key={g}>{GENERATION_LABELS[g] ?? `${g}.ª generación`}</span>
          ))}
        </div>
        <TreeNode node={pedigree.tree} generation={0} childId={null} role={null} ctx={ctx} />
      </div>
    </div>
  )
}

interface TreeContext {
  lastGeneration: number
  canExpand: boolean
  canEdit: boolean
  repeatColor: Map<string, string>
  onExpand(): void
}

interface TreeNodeProps {
  /** null = desconocido. */
  node: PedigreeTreeNode | null
  generation: number
  /** Hijo de este ancestro (para "Cargar" un padre desconocido). */
  childId: string | null
  role: 'Madre' | 'Padre' | null
  ctx: TreeContext
}

function TreeNode({ node, generation, childId, role, ctx }: TreeNodeProps) {
  const compact = generation >= 3
  // Los padres se dibujan hasta la última generación pedida, también si son desconocidos.
  const showParents = !!node && generation < ctx.lastGeneration

  return (
    <div className="pedigree__node">
      {node ? (
        <AncestorBox node={node} role={role} compact={compact} ctx={ctx} isRoot={generation === 0} />
      ) : (
        <UnknownBox role={role} compact={compact} childId={childId} canEdit={ctx.canEdit} />
      )}
      {showParents && (
        <div className="pedigree__parents">
          <div className="pedigree__branch">
            <TreeNode node={node.dam ?? null} generation={generation + 1} childId={node.id} role="Madre" ctx={ctx} />
          </div>
          <div className="pedigree__branch">
            <TreeNode node={node.sire ?? null} generation={generation + 1} childId={node.id} role="Padre" ctx={ctx} />
          </div>
        </div>
      )}
    </div>
  )
}

function AncestorBox({
  node,
  role,
  compact,
  ctx,
  isRoot,
}: {
  node: PedigreeTreeNode
  role: string | null
  compact: boolean
  ctx: TreeContext
  isRoot: boolean
}) {
  const color = ctx.repeatColor.get(node.id)
  // El resto de los datos va en el tooltip para que las casillas entren en el árbol.
  const tooltip = [
    animalLabel(node),
    role,
    node.breedName && `Raza: ${node.breedName}`,
    node.geneticCategory && `Categoría: ${GENETIC_CATEGORY_LABELS[node.geneticCategory]}`,
    !node.isExternal && node.absidRegistry && `ABSID: ${node.absidRegistry}`,
    node.birthDate && `Nacimiento: ${formatDate(node.birthDate)}`,
    node.isExternal && 'Reproductor externo',
    color && 'Aparece más de una vez en el árbol',
  ]
    .filter(Boolean)
    .join('\n')

  const className = [
    'pedigree__box',
    compact && 'pedigree__box--compact',
    isRoot && 'pedigree__box--root',
    color && 'pedigree__box--repeated',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="pedigree__cell">
      <Link
        to={ANIMALS_ROUTES.detail(node.id)}
        className={className}
        title={tooltip}
        style={color ? ({ '--repeat-color': color } as CSSProperties) : undefined}
      >
        <span className="pedigree__name">{animalLabel(node)}</span>
        {(node.isExternal || node.geneticCategory) && (
          <span className="pedigree__meta">
            {node.isExternal && <Badge tone="accent">Externo</Badge>}
            {node.geneticCategory && <span>{geneticCategoryShort(node.geneticCategory)}</span>}
          </span>
        )}
      </Link>
      {node.hasMoreAncestors && ctx.canExpand && (
        <button
          type="button"
          className="pedigree__more"
          title="Tiene más ancestros registrados: ampliar el árbol"
          aria-label={`Ampliar el árbol: ${animalLabel(node)} tiene más ancestros`}
          onClick={ctx.onExpand}
        >
          …
        </button>
      )}
    </div>
  )
}

function UnknownBox({
  role,
  compact,
  childId,
  canEdit,
}: {
  role: string | null
  compact: boolean
  childId: string | null
  canEdit: boolean
}) {
  return (
    <div className="pedigree__cell">
      <div className={['pedigree__box', 'pedigree__box--unknown', compact && 'pedigree__box--compact'].filter(Boolean).join(' ')}>
        <span className="pedigree__name">
          {role === 'Madre' ? 'Madre desconocida' : role === 'Padre' ? 'Padre desconocido' : 'Desconocido'}
        </span>
        {canEdit && childId && (
          <Link to={ANIMALS_ROUTES.edit(childId)} className="pedigree__load">
            <Icon name="plus" size={12} /> Cargar
          </Link>
        )}
      </div>
    </div>
  )
}
