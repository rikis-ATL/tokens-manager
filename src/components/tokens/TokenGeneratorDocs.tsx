'use client';

export function TokenGeneratorDocs() {
  return (
    <div className="rounded-lg py-2 mb-2 overflow-y-auto flex-1 min-h-0 pr-1 text-sm text-foreground">
      <h3 className="text-xl font-bold text-foreground tracking-tight">
        Welcome to the design tokens workspace
      </h3>
      <p className="mt-3 leading-relaxed text-foreground">
        If you are new here, think of this screen as your home for one <strong className="font-semibold text-foreground">collection</strong>
        {' '}of design tokens. You can edit tokens in a table, build or inspect them on a <strong className="font-semibold text-foreground">graph</strong>,
        preview them in a <strong className="font-semibold text-foreground">style guide</strong>, and optionally sync them to{' '}
        <strong className="font-semibold text-foreground">Figma</strong> or <strong className="font-semibold text-foreground">GitHub</strong> when your
        organization allows it. Nothing leaves this app until you use Save, download, or a sync action.
      </p>

      <div className="mt-8 space-y-10">
        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">What you will see on this page</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-foreground">Tokens tab</span> — The token table and the graph work together. Click a row to see its{' '}
              <span className="font-semibold text-foreground">reference chain</span> in the graph. Otherwise the graph shows group structure or how tokens
              are generated from nodes.
            </li>
            <li>
              <span className="font-semibold text-foreground">Style Guide tab</span> — A read-only preview: colors (often grouped), spacing, type, shadows,
              corner radii, and other values as simple cards. Use it to sanity-check the same data you edit in the table.
            </li>
            <li>
              <span className="font-semibold text-foreground">Theme</span> (when your collection has themes) — <em>Default</em> is the main collection.
              Other themes keep their own copy of tokens and graph layout so you can ship light/dark or brand variants without losing the base set.
            </li>
            <li>
              <span className="font-semibold text-foreground">Prefix</span> in the header is a namespace added to paths everywhere, including exports.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Groups and folders</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>Use the sidebar or breadcrumb to pick a group. Groups can nest like folders.</li>
            <li>
              <span className="font-semibold text-foreground">All groups</span> switches the graph to one view across your top-level groups.
            </li>
            <li>If you can edit, you can add, rename, reorder, or remove groups. A group can be set to <span className="font-semibold text-foreground">omit its name from exported paths</span> so variable names stay short.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Editing tokens in the table</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-foreground">Path</span> — Dots separate segments, e.g.{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">color.brand.primary</code>.
              Some rows from the graph lock the path so names stay tied to the graph.
            </li>
            <li>
              <span className="font-semibold text-foreground">Type and value</span> — Choose a token type, then enter a value. Simple types use plain text;
              composite types use JSON.
            </li>
            <li>
              <span className="font-semibold text-foreground">Colors</span> — You get a live swatch, a picker that supports several formats (hex, rgb, hsl, …),
              and a muted swatch when a reference cannot be resolved yet.
            </li>
            <li>
              <span className="font-semibold text-foreground">References</span> — Point one token at another with{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">{'{path.to.otherToken}'}</code>.
              The reference picker helps you pick a target without typos.
            </li>
            <li>Expand a row to add a <span className="font-semibold text-foreground">description</span> and optional <span className="font-semibold text-foreground">attributes</span> (extra labels for tools or your team).</li>
            <li>
              <span className="font-semibold text-foreground">Bulk actions</span> — Select rows with checkboxes; hold Shift to select a range. A bar at the
              bottom offers delete, move to another group, change type, normalize color format, and add or remove a shared path prefix.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Token graph: how nodes work</h4>
          <p className="leading-relaxed ml-1">
            The graph is a visual pipeline. You add <span className="font-semibold text-foreground">nodes</span>, connect them with{' '}
            <span className="font-semibold text-foreground">wires</span>, and the app evaluates them in dependency order (upstream first).
            Hover a wire to delete it. <span className="font-semibold text-foreground">Handle colors</span> hint at data shape: blue for numbers, green for
            strings, violet for arrays, gray for general outputs, and emerald for the special “tokens into group” port on the group node.
          </p>
          <p className="leading-relaxed ml-1">
            <span className="font-semibold text-foreground">Group node</span> (the root for the current group) has a <span className="font-semibold text-foreground">tokens-in</span>{' '}
            port. When a <span className="font-semibold text-foreground">Token output</span> node (or anything that produces a token batch) connects there, an{' '}
            <span className="font-semibold text-foreground">Apply</span> button appears — use it to add generated tokens into the group. You can also target a{' '}
            <span className="font-semibold text-foreground">new sub-group</span> from Token output or JSON so the app creates a child folder for you.
          </p>
          <p className="leading-relaxed ml-1 font-semibold text-foreground">
            Node types you can place on the canvas
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-foreground">Constant</span> — A fixed number, short text, or list of strings. You can{' '}
              <span className="font-semibold text-foreground">link</span> an existing collection token so saves store a{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono text-foreground">{'{path}'}</code> reference. Use Save in the node to
              create a single token without a full pipeline.
            </li>
            <li>
              <span className="font-semibold text-foreground">Harmonic series</span> — Builds a geometric number scale from a base (great for modular type or
              spacing ratios). Wire optional constants into base, step counts, ratio, or precision to override the fields.
            </li>
            <li>
              <span className="font-semibold text-foreground">Array (format)</span> — Converts a wired number series (or typed CSV / list / pasted array) into
              strings with a unit (rem, px, em, %, none, or color mode) and rounding. Can open “Save as token” for quick exports.
            </li>
            <li>
              <span className="font-semibold text-foreground">Math</span> — Multiply, divide, add, subtract, round, floor, ceil, or clamp a number or an array.
              Operand and clamp limits can be wired from Constant nodes; optional suffix appends units to results.
            </li>
            <li>
              <span className="font-semibold text-foreground">Color convert</span> — <span className="font-semibold text-foreground">Convert</span> rewrites CSS
              colors between hex, rgb, hsl, and oklch. <span className="font-semibold text-foreground">HSL compose</span> fixes hue and saturation, then maps wired
              lightness (one value or a list) into full colors — useful after a numeric scale node.
            </li>
            <li>
              <span className="font-semibold text-foreground">Palette</span> — Generates a stepped color ramp from a base hue/saturation (lightness from min to max),
              with naming options (e.g. 100–900 or 50–950), optional <span className="font-semibold text-foreground">preset</span> families, extra accent steps, and
              output format. Feeds names and color values into Token output.
            </li>
            <li>
              <span className="font-semibold text-foreground">A11y contrast</span> — Takes foreground and background colors (typed or wired) and reports contrast
              ratio, WCAG level, and whether common AA / AAA text thresholds pass — handy when documenting accessible pairs.
            </li>
            <li>
              <span className="font-semibold text-foreground">Token</span> (reference) — Pick any token in the collection; its resolved value is available on the
              output port for wiring into Math, Array, Color convert, Typography, etc.
            </li>
            <li>
              <span className="font-semibold text-foreground">Typography</span> — Combines font family, size, line height, weight, letter spacing, and font style.
              Each field can be wired from another node. The node previews type on canvas and exposes shorthand / JSON-style outputs for typography tokens.
            </li>
            <li>
              <span className="font-semibold text-foreground">Token output</span> — Turns wired <span className="font-semibold text-foreground">values</span> (and
              optional name prefix, custom names, or naming pattern like step-100) into many tokens at once. Set token type and whether rows land in the{' '}
              <span className="font-semibold text-foreground">current group</span> or a <span className="font-semibold text-foreground">new sub-group</span>, then
              connect to the group node and Apply.
            </li>
            <li>
              <span className="font-semibold text-foreground">JSON</span> — Upload or paste a JSON token file; the node parses rows (name, value, optional type and
              metadata). Generate into the current group or as a sub-group, similar to a small bulk import.
            </li>
            <li>
              <span className="font-semibold text-foreground">Generator (classic)</span> — The older all-in-one color or dimension scale generator. You can still wire
              a base color or base number in to drive hue or modular scale settings, then feed results toward Token output or Apply.
            </li>
            <li>
              <span className="font-semibold text-foreground">Group</span> (creator) — Define a <span className="font-semibold text-foreground">new</span> folder name,
              default token type, and a short list of name/value pairs, then create it under the current group or at the <span className="font-semibold text-foreground">collection root</span>.
            </li>
          </ul>
          <p className="leading-relaxed ml-1 text-xs text-foreground border-l-2 border-border pl-3">
            Graph layout for each group is saved on a short timer after you move nodes or change connections (and is included when you Save the collection).
            Each theme keeps its own graph; switching themes remounts the canvas so node IDs stay consistent.
          </p>
          <p className="leading-relaxed ml-1">
            When you <span className="font-semibold text-foreground">select a token row</span> in the table, the right panel switches to a compact{' '}
            <span className="font-semibold text-foreground">reference chain</span> view so you can see how aliases and references relate — that view is separate
            from the structure/generation graph.
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Themes (on the Themes page)</h4>
          <p className="leading-relaxed ml-1">
            Custom themes are managed from this collection&apos;s <span className="font-semibold text-foreground">Themes</span> page. For each group in a theme,
            you choose one of three modes:
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li><span className="font-semibold text-foreground">Enabled</span> — You may override tokens (and graph) for that group inside this theme.</li>
            <li><span className="font-semibold text-foreground">Source</span> — The theme shows the default collection values for that group as read-only; use reset when you want to match default again.</li>
            <li><span className="font-semibold text-foreground">Disabled</span> — That group is hidden for this theme.</li>
          </ul>
          <p className="leading-relaxed ml-1">
            Changing themes reloads the graph so each theme keeps consistent node identities. If a theme&apos;s graph would produce different paths than the
            default, the app may show a warning so you can fix mismatches.
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Roles and what you are allowed to do</h4>
          <p className="leading-relaxed ml-1">
            Your <span className="font-semibold text-foreground">organization role</span> sets the ceiling. On each collection, you may also have a{' '}
            <span className="font-semibold text-foreground">collection role</span> (except org Admins, who have full access everywhere). The app combines
            these to show or hide buttons.
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-foreground">Admin</span> — Full access: read and write tokens, manage collections and users where the product
              supports it, and use GitHub and Figma sync when those features are available.
            </li>
            <li>
              <span className="font-semibold text-foreground">Editor</span> — Read and write tokens on collections you are assigned to; create collections if
              your org allows; use <span className="font-semibold text-foreground">Push to GitHub</span> and <span className="font-semibold text-foreground">Figma</span>{' '}
              import/export when your role includes those actions.
            </li>
            <li>
              <span className="font-semibold text-foreground">Viewer</span> — Read-only. You can browse the table, graph, and style guide, and use{' '}
              <span className="font-semibold text-foreground">Preview JSON</span> and <span className="font-semibold text-foreground">Download JSON</span>.
              Save, bulk edits, destructive menu items, and GitHub/Figma sync are not available.
            </li>
            <li>
              <span className="font-semibold text-foreground">Demo</span> — Read across collections you can open. Editing and Save are limited to{' '}
              <span className="font-semibold text-foreground">playground</span> collections, except in a{' '}
              <span className="font-semibold text-foreground">public demo session</span> (see the next section). GitHub and Figma sync are only available in that public
              demo deployment, not for a Demo role on a normal account.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Demo mode</h4>
          <p className="leading-relaxed ml-1">
            You might use the app in demo mode in two different situations. Both use the <span className="font-semibold text-foreground">Demo</span> role, but the
            rules are slightly different.
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-foreground">Public demo (try without a full account)</span> — On deployments that turn on open demos, you can land
              already signed in as a shared <span className="font-semibold text-foreground">Demo Visitor</span>. The header shows a <span className="font-semibold text-foreground">Demo mode</span>{' '}
              badge instead of the usual database status. The main sidebar may be hidden so the screen stays focused on collections and tokens. The interface
              typically lets you <span className="font-semibold text-foreground">edit and Save</span> more freely so you can explore; treat anything you change as{' '}
              <span className="font-semibold text-foreground">temporary</span> — demo data can be reset at any time. Open your account menu and choose{' '}
              <span className="font-semibold text-foreground">Exit Demo</span> when you are done (the page reloads to leave the demo session).
            </li>
            <li>
              <span className="font-semibold text-foreground">Demo role on a normal account</span> — If your organization assigns you the Demo role on a regular
              sign-in, you can browse collections the same way, but <span className="font-semibold text-foreground">Save</span>, the graph, bulk actions, and other
              edits only work on collections marked as <span className="font-semibold text-foreground">Playground</span>. Everything else is view-only, like a Viewer.
              Playground collections are meant as a safe sandbox; production libraries stay protected.
            </li>
            <li>
              <span className="font-semibold text-foreground">Sync in public demo</span> — On a deployment with open demo mode, GitHub and Figma import/export are
              available so you can try integrations using <span className="font-semibold text-foreground">your own</span> tokens and file details. The{' '}
              <span className="font-semibold text-foreground">Demo role on a normal account</span> still does not include those actions; use{' '}
              <span className="font-semibold text-foreground">Preview JSON</span> and <span className="font-semibold text-foreground">Download JSON</span> there.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Saving and syncing your work</h4>
          <p className="leading-relaxed ml-1">
            Use this section to understand <span className="font-semibold text-foreground">where data goes</span>. Sync features always ask for credentials or
            confirmation in a dialog; your tokens stay in the browser until you complete a step.
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-foreground">Save (toolbar)</span> — Writes the current collection (and theme, if selected) to the app database:
              tokens, group structure, and the latest graph state. Use Save after meaningful edits so teammates load the same data.
            </li>
            <li>
              <span className="font-semibold text-foreground">Graph</span> — After you move nodes or change the graph, layout and structure are saved on a short
              delay without an extra click, in addition to being included when you Save.
            </li>
            <li>
              <span className="font-semibold text-foreground">Preview JSON</span> — Opens a modal with the token set as structured JSON. Read-only; does not upload anywhere.
            </li>
            <li>
              <span className="font-semibold text-foreground">Download JSON</span> — Saves <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">design-tokens.json</code>{' '}
              to your computer. Good for backups, CI, or tools that read W3C-style token files offline.
            </li>
            <li>
              <span className="font-semibold text-foreground">Load from Database</span> (⋯ menu, editors) — Brings in tokens from another collection already stored
              in the app. Review the result before you Save so you do not overwrite work by accident.
            </li>
            <li>
              <span className="font-semibold text-foreground">Save As</span> (⋯ menu, editors) — Creates a new saved collection from what you have open (name and
              options in the dialog).
            </li>
            <li>
              <span className="font-semibold text-foreground">Import from Figma</span> (⋯ menu, when allowed) — Connects with a Figma personal access token and file,
              lists variable collections in that file, and imports a chosen set into this app as collection data. You typically name the new or updated collection
              in the wizard.
            </li>
            <li>
              <span className="font-semibold text-foreground">Export to Figma</span> (⋯ menu, when allowed) — Takes the token set you are viewing and pushes it into
              Figma variables: you supply token, file, and target collection in the dialog so the correct file receives updates.
            </li>
            <li>
              <span className="font-semibold text-foreground">Import from GitHub</span> / <span className="font-semibold text-foreground">Push to GitHub</span>{' '}
              (⋯ menu, when allowed) — Reads or writes token files in a Git repository using your GitHub credentials and chosen branch/path. A directory picker
              helps select the folder. Finish in the UI to confirm the operation succeeded.
            </li>
          </ul>
          <p className="text-xs leading-relaxed text-foreground ml-1 border-l-2 border-border pl-3">
            GitHub and Figma entries only appear when your role includes those integrations. If an action says configuration is missing, connect tokens and
            repository details in the dialog (or ask an admin) before retrying.
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Toolbar and ⋯ menu (quick map)</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>Eye icon — Preview JSON. Download icon — JSON file to disk.</li>
            <li>Save — Persist to the database (hidden or disabled if you are read-only).</li>
            <li>
              ⋯ — Save As, Load from Database; Figma and GitHub import/export when permitted; collection Edit/Delete; Clear Form and other destructive actions
              for editors only.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Token types you can choose</h4>
          <p className="text-xs leading-relaxed text-foreground ml-1">
            Available types include: color, dimension, fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, borderRadius, borderWidth, opacity, boxShadow,
            textShadow, duration, cubicBezier, number, string, strokeStyle, border, transition, shadow, gradient, typography.
          </p>
          <div className="grid grid-cols-1 gap-4 text-xs leading-relaxed text-foreground md:grid-cols-2 md:gap-6">
            <div className="space-y-2">
              <p><span className="font-semibold text-foreground">color:</span> #ff0000, rgb(255,0,0), hsl(0,100%,50%)</p>
              <p><span className="font-semibold text-foreground">dimension:</span> 16px, 1rem, 8pt</p>
              <p><span className="font-semibold text-foreground">fontFamily:</span> [&quot;Arial&quot;, &quot;sans-serif&quot;]</p>
              <p><span className="font-semibold text-foreground">fontWeight:</span> 400, &quot;normal&quot;, &quot;bold&quot;</p>
              <p><span className="font-semibold text-foreground">duration:</span> 200ms, 0.2s</p>
              <p><span className="font-semibold text-foreground">cubicBezier:</span> [0.25, 0.1, 0.25, 1]</p>
              <p><span className="font-semibold text-foreground">number, string, opacity:</span> use literals your type expects</p>
            </div>
            <div className="space-y-2">
              <p><span className="font-semibold text-foreground">strokeStyle, border:</span> JSON objects with width, style, dashes, or color fields</p>
              <p><span className="font-semibold text-foreground">shadow, boxShadow, textShadow:</span> offset, blur, spread, color</p>
              <p><span className="font-semibold text-foreground">gradient:</span> type plus color stops</p>
              <p><span className="font-semibold text-foreground">typography, transition:</span> composite objects (several properties in one value)</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-foreground">Tips before you go</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>Start with clear, semantic paths like <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">color.semantic.success</code> so libraries scale.</li>
            <li>Short descriptions and attributes help the next person (or future you) know when to use a token.</li>
            <li>After a long editing session, Save once more before you close the tab so the server copy matches what you see.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
