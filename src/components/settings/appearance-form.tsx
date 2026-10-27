export function AppearanceForm() {
  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt className="text-xs text-muted-foreground">Tema</dt>
        <dd className="mt-2 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-4 rounded-sm border bg-background"
          />
          Escuro
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Cor principal</dt>
        <dd className="mt-2 flex items-center gap-2">
          <span aria-hidden="true" className="size-4 rounded-sm bg-primary" />
          Azul
        </dd>
      </div>
    </dl>
  );
}
