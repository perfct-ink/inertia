import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// The base of the API layer. `lib/api.ts` is the HTTP client (auth, workspace
// header, error notices); this file is what every model's API class builds on,
// and the hook helpers the model files use so the fetch / mutate / invalidate
// pattern is written once. One file per model in this folder extends
// `ApiResource` with its path and Rails param key, adds any calls specific to
// the model, and exports the hooks the views use.

// A TanStack Query key, or just its root ("epics" is ["epics"]).
type InvalidateKey = string | readonly unknown[]

export class ApiResource<Model, CreateInput = Partial<Model>, UpdateInput = Partial<Model>> {
  constructor(
    // Collection path, e.g. "/api/v1/epics".
    readonly path: string,
    // Rails root key the body is wrapped in, e.g. "epic" sends { epic: {...} }.
    // null sends the data as the body.
    readonly param: string | null,
    // Root of the model's query keys, e.g. "epics" for ["epics"] and ["epics", 5].
    readonly queryKey: string,
  ) {}

  list(params?: object) {
    return api.get<Model[]>(this.path, { params }).then((r) => r.data)
  }

  find(id: number) {
    return api.get<Model>(this.url(id)).then((r) => r.data)
  }

  create(data: CreateInput) {
    return api.post<Model>(this.path, this.body(data)).then((r) => r.data)
  }

  update(id: number, data: UpdateInput) {
    return api.patch<Model>(this.url(id), this.body(data)).then((r) => r.data)
  }

  destroy(id: number) {
    return api.delete(this.url(id))
  }

  protected url(id: number) {
    return `${this.path}/${id}`
  }

  protected body(data: unknown) {
    return this.param ? { [this.param]: data } : data
  }
}

// Mutation hook that refetches the listed queries once the call succeeds.
export function useApiMutation<Variables, Result>(mutationFn: (variables: Variables) => Promise<Result>, invalidate: InvalidateKey[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of invalidate) qc.invalidateQueries({ queryKey: typeof key === 'string' ? [key] : key })
    },
  })
}

interface ListOptions {
  // Filters sent as the query string; they are part of the query key.
  params?: object
  // Overrides the app default (60s) when the data changes with other models'.
  staleTime?: number
  // false holds the fetch back until what the filters need has been chosen.
  enabled?: boolean
  // Refetch every this many milliseconds while the page is visible, for lists
  // left on screen that other people change.
  refetchInterval?: number
}

export function useResourceList<Model, Create, Update>(resource: ApiResource<Model, Create, Update>, { params, staleTime, enabled, refetchInterval }: ListOptions = {}) {
  return useQuery<Model[]>({
    queryKey: params ? [resource.queryKey, params] : [resource.queryKey],
    queryFn: () => resource.list(params),
    ...(staleTime !== undefined && { staleTime }),
    ...(enabled !== undefined && { enabled }),
    ...(refetchInterval !== undefined && { refetchInterval }),
  })
}

export function useResourceFind<Model, Create, Update>(resource: ApiResource<Model, Create, Update>, id: number) {
  return useQuery<Model>({
    queryKey: [resource.queryKey, id],
    queryFn: () => resource.find(id),
    enabled: !!id,
  })
}

// `alsoInvalidate` names the other models' queries the change shows up in.
export function useResourceCreate<Model, Create, Update>(resource: ApiResource<Model, Create, Update>, alsoInvalidate: InvalidateKey[] = []) {
  return useApiMutation((data: Create) => resource.create(data), [resource.queryKey, ...alsoInvalidate])
}

// Takes the id with the fields to change: mutate({ id, title }).
export function useResourceUpdate<Model, Create, Update extends object>(resource: ApiResource<Model, Create, Update>, alsoInvalidate: InvalidateKey[] = []) {
  return useApiMutation(({ id, ...data }: Update & { id: number }) => resource.update(id, data as unknown as Update), [resource.queryKey, ...alsoInvalidate])
}

export function useResourceDelete<Model, Create, Update>(resource: ApiResource<Model, Create, Update>, alsoInvalidate: InvalidateKey[] = []) {
  return useApiMutation((id: number) => resource.destroy(id), [resource.queryKey, ...alsoInvalidate])
}
