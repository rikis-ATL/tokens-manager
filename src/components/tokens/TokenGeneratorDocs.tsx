'use client';

export function TokenGeneratorDocs() {
  return (
    <div className="rounded-lg py-2 mb-2 overflow-y-auto flex-1 min-h-0 pr-1 text-sm text-gray-800">
      <h3 className="text-xl font-bold text-gray-900 tracking-tight">
        Welcome to the design tokens workspace
      </h3>
      <p className="mt-3 leading-relaxed text-gray-800">
        If you are new here, think of this screen as your home for one <strong className="font-semibold text-gray-900">collection</strong>
        {' '}of design tokens. You can edit tokens in a table, build or inspect them on a <strong className="font-semibold text-gray-900">graph</strong>,
        preview them in a <strong className="font-semibold text-gray-900">style guide</strong>, and optionally sync them to{' '}
        <strong className="font-semibold text-gray-900">Figma</strong> or <strong className="font-semibold text-gray-900">GitHub</strong> when your
        organization allows it. Nothing leaves this app until you use Save, download, or a sync action.
      </p>

      <div className="mt-8 space-y-10">
        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">What you will see on this page</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-gray-900">Tokens tab</span> — The token table and the graph work together. Click a row to see its{' '}
              <span className="font-semibold text-gray-900">reference chain</span> in the graph. Otherwise the graph shows group structure or how tokens
              are generated from nodes.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Style Guide tab</span> — A read-only preview: colors (often grouped), spacing, type, shadows,
              corner radii, and other values as simple cards. Use it to sanity-check the same data you edit in the table.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Theme</span> (when your collection has themes) — <em>Default</em> is the main collection.
              Other themes keep their own copy of tokens and graph layout so you can ship light/dark or brand variants without losing the base set.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Prefix</span> in the header is a namespace added to paths everywhere, including exports.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Groups and folders</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>Use the sidebar or breadcrumb to pick a group. Groups can nest like folders.</li>
            <li>
              <span className="font-semibold text-gray-900">All groups</span> switches the graph to one view across your top-level groups.
            </li>
            <li>If you can edit, you can add, rename, reorder, or remove groups. A group can be set to <span className="font-semibold text-gray-900">omit its name from exported paths</span> so variable names stay short.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Editing tokens in the table</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-gray-900">Path</span> — Dots separate segments, e.g.{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-900">color.brand.primary</code>.
              Some rows from the graph lock the path so names stay tied to the graph.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Type and value</span> — Choose a token type, then enter a value. Simple types use plain text;
              composite types use JSON.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Colors</span> — You get a live swatch, a picker that supports several formats (hex, rgb, hsl, …),
              and a muted swatch when a reference cannot be resolved yet.
            </li>
            <li>
              <span className="font-semibold text-gray-900">References</span> — Point one token at another with{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-900">{'{path.to.otherToken}'}</code>.
              The reference picker helps you pick a target without typos.
            </li>
            <li>Expand a row to add a <span className="font-semibold text-gray-900">description</span> and optional <span className="font-semibold text-gray-900">attributes</span> (extra labels for tools or your team).</li>
            <li>
              <span className="font-semibold text-gray-900">Bulk actions</span> — Select rows with checkboxes; hold Shift to select a range. A bar at the
              bottom offers delete, move to another group, change type, normalize color format, and add or remove a shared path prefix.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Token graph: how nodes work</h4>
          <p className="leading-relaxed ml-1">
            The graph is a visual pipeline. You add <span className="font-semibold text-gray-900">nodes</span>, connect them with{' '}
            <span className="font-semibold text-gray-900">wires</span>, and the app evaluates them in dependency order (upstream first).
            Hover a wire to delete it. <span className="font-semibold text-gray-900">Handle colors</span> hint at data shape: blue for numbers, green for
            strings, violet for arrays, gray for general outputs, and emerald for the special “tokens into group” port on the group node.
          </p>
          <p className="leading-relaxed ml-1">
            <span className="font-semibold text-gray-900">Group node</span> (the root for the current group) has a <span className="font-semibold text-gray-900">tokens-in</span>{' '}
            port. When a <span className="font-semibold text-gray-900">Token output</span> node (or anything that produces a token batch) connects there, an{' '}
            <span className="font-semibold text-gray-900">Apply</span> button appears — use it to add generated tokens into the group. You can also target a{' '}
            <span className="font-semibold text-gray-900">new sub-group</span> from Token output or JSON so the app creates a child folder for you.
          </p>
          <p className="leading-relaxed ml-1 font-semibold text-gray-900">
            Node types you can place on the canvas
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-gray-900">Constant</span> — A fixed number, short text, or list of strings. You can{' '}
              <span className="font-semibold text-gray-900">link</span> an existing collection token so saves store a{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] font-mono text-gray-900">{'{path}'}</code> reference. Use Save in the node to
              create a single token without a full pipeline.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Harmonic series</span> — Builds a geometric number scale from a base (great for modular type or
              spacing ratios). Wire optional constants into base, step counts, ratio, or precision to override the fields.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Array (format)</span> — Converts a wired number series (or typed CSV / list / pasted array) into
              strings with a unit (rem, px, em, %, none, or color mode) and rounding. Can open “Save as token” for quick exports.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Math</span> — Multiply, divide, add, subtract, round, floor, ceil, or clamp a number or an array.
              Operand and clamp limits can be wired from Constant nodes; optional suffix appends units to results.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Color convert</span> — <span className="font-semibold text-gray-900">Convert</span> rewrites CSS
              colors between hex, rgb, hsl, and oklch. <span className="font-semibold text-gray-900">HSL compose</span> fixes hue and saturation, then maps wired
              lightness (one value or a list) into full colors — useful after a numeric scale node.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Palette</span> — Generates a stepped color ramp from a base hue/saturation (lightness from min to max),
              with naming options (e.g. 100–900 or 50–950), optional <span className="font-semibold text-gray-900">preset</span> families, extra accent steps, and
              output format. Feeds names and color values into Token output.
            </li>
            <li>
              <span className="font-semibold text-gray-900">A11y contrast</span> — Takes foreground and background colors (typed or wired) and reports contrast
              ratio, WCAG level, and whether common AA / AAA text thresholds pass — handy when documenting accessible pairs.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Token</span> (reference) — Pick any token in the collection; its resolved value is available on the
              output port for wiring into Math, Array, Color convert, Typography, etc.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Typography</span> — Combines font family, size, line height, weight, letter spacing, and font style.
              Each field can be wired from another node. The node previews type on canvas and exposes shorthand / JSON-style outputs for typography tokens.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Token output</span> — Turns wired <span className="font-semibold text-gray-900">values</span> (and
              optional name prefix, custom names, or naming pattern like step-100) into many tokens at once. Set token type and whether rows land in the{' '}
              <span className="font-semibold text-gray-900">current group</span> or a <span className="font-semibold text-gray-900">new sub-group</span>, then
              connect to the group node and Apply.
            </li>
            <li>
              <span className="font-semibold text-gray-900">JSON</span> — Upload or paste a JSON token file; the node parses rows (name, value, optional type and
              metadata). Generate into the current group or as a sub-group, similar to a small bulk import.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Generator (classic)</span> — The older all-in-one color or dimension scale generator. You can still wire
              a base color or base number in to drive hue or modular scale settings, then feed results toward Token output or Apply.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Group</span> (creator) — Define a <span className="font-semibold text-gray-900">new</span> folder name,
              default token type, and a short list of name/value pairs, then create it under the current group or at the <span className="font-semibold text-gray-900">collection root</span>.
            </li>
          </ul>
          <p className="leading-relaxed ml-1 text-xs text-gray-700 border-l-2 border-gray-200 pl-3">
            Graph layout for each group is saved on a short timer after you move nodes or change connections (and is included when you Save the collection).
            Each theme keeps its own graph; switching themes remounts the canvas so node IDs stay consistent.
          </p>
          <p className="leading-relaxed ml-1">
            When you <span className="font-semibold text-gray-900">select a token row</span> in the table, the right panel switches to a compact{' '}
            <span className="font-semibold text-gray-900">reference chain</span> view so you can see how aliases and references relate — that view is separate
            from the structure/generation graph.
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Themes (on the Themes page)</h4>
          <p className="leading-relaxed ml-1">
            Custom themes are managed from this collection&apos;s <span className="font-semibold text-gray-900">Themes</span> page. For each group in a theme,
            you choose one of three modes:
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li><span className="font-semibold text-gray-900">Enabled</span> — You may override tokens (and graph) for that group inside this theme.</li>
            <li><span className="font-semibold text-gray-900">Source</span> — The theme shows the default collection values for that group as read-only; use reset when you want to match default again.</li>
            <li><span className="font-semibold text-gray-900">Disabled</span> — That group is hidden for this theme.</li>
          </ul>
          <p className="leading-relaxed ml-1">
            Changing themes reloads the graph so each theme keeps consistent node identities. If a theme&apos;s graph would produce different paths than the
            default, the app may show a warning so you can fix mismatches.
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Roles and what you are allowed to do</h4>
          <p className="leading-relaxed ml-1">
            Your <span className="font-semibold text-gray-900">organization role</span> sets the ceiling. On each collection, you may also have a{' '}
            <span className="font-semibold text-gray-900">collection role</span> (except org Admins, who have full access everywhere). The app combines
            these to show or hide buttons.
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-gray-900">Admin</span> — Full access: read and write tokens, manage collections and users where the product
              supports it, and use GitHub and Figma sync when those features are available.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Editor</span> — Read and write tokens on collections you are assigned to; create collections if
              your org allows; use <span className="font-semibold text-gray-900">Push to GitHub</span> and <span className="font-semibold text-gray-900">Figma</span>{' '}
              import/export when your role includes those actions.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Viewer</span> — Read-only. You can browse the table, graph, and style guide, and use{' '}
              <span className="font-semibold text-gray-900">Preview JSON</span> and <span className="font-semibold text-gray-900">Download JSON</span>.
              Save, bulk edits, destructive menu items, and GitHub/Figma sync are not available.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Demo</span> — Read across collections you can open. Editing and Save are limited to{' '}
              <span className="font-semibold text-gray-900">playground</span> collections, except in a{' '}
              <span className="font-semibold text-gray-900">public demo session</span> (see the next section). GitHub and Figma sync are only available in that public
              demo deployment, not for a Demo role on a normal account.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Demo mode</h4>
          <p className="leading-relaxed ml-1">
            You might use the app in demo mode in two different situations. Both use the <span className="font-semibold text-gray-900">Demo</span> role, but the
            rules are slightly different.
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-gray-900">Public demo (try without a full account)</span> — On deployments that turn on open demos, you can land
              already signed in as a shared <span className="font-semibold text-gray-900">Demo Visitor</span>. The header shows a <span className="font-semibold text-gray-900">Demo mode</span>{' '}
              badge instead of the usual database status. The main sidebar may be hidden so the screen stays focused on collections and tokens. The interface
              typically lets you <span className="font-semibold text-gray-900">edit and Save</span> more freely so you can explore; treat anything you change as{' '}
              <span className="font-semibold text-gray-900">temporary</span> — demo data can be reset at any time. Open your account menu and choose{' '}
              <span className="font-semibold text-gray-900">Exit Demo</span> when you are done (the page reloads to leave the demo session).
            </li>
            <li>
              <span className="font-semibold text-gray-900">Demo role on a normal account</span> — If your organization assigns you the Demo role on a regular
              sign-in, you can browse collections the same way, but <span className="font-semibold text-gray-900">Save</span>, the graph, bulk actions, and other
              edits only work on collections marked as <span className="font-semibold text-gray-900">Playground</span>. Everything else is view-only, like a Viewer.
              Playground collections are meant as a safe sandbox; production libraries stay protected.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Sync in public demo</span> — On a deployment with open demo mode, GitHub and Figma import/export are
              available so you can try integrations using <span className="font-semibold text-gray-900">your own</span> tokens and file details. The{' '}
              <span className="font-semibold text-gray-900">Demo role on a normal account</span> still does not include those actions; use{' '}
              <span className="font-semibold text-gray-900">Preview JSON</span> and <span className="font-semibold text-gray-900">Download JSON</span> there.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Saving and syncing your work</h4>
          <p className="leading-relaxed ml-1">
            Use this section to understand <span className="font-semibold text-gray-900">where data goes</span>. Sync features always ask for credentials or
            confirmation in a dialog; your tokens stay in the browser until you complete a step.
          </p>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>
              <span className="font-semibold text-gray-900">Save (toolbar)</span> — Writes the current collection (and theme, if selected) to the app database:
              tokens, group structure, and the latest graph state. Use Save after meaningful edits so teammates load the same data.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Graph</span> — After you move nodes or change the graph, layout and structure are saved on a short
              delay without an extra click, in addition to being included when you Save.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Preview JSON</span> — Opens a modal with the token set as structured JSON. Read-only; does not upload anywhere.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Download JSON</span> — Saves <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-900">design-tokens.json</code>{' '}
              to your computer. Good for backups, CI, or tools that read W3C-style token files offline.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Load from Database</span> (⋯ menu, editors) — Brings in tokens from another collection already stored
              in the app. Review the result before you Save so you do not overwrite work by accident.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Save As</span> (⋯ menu, editors) — Creates a new saved collection from what you have open (name and
              options in the dialog).
            </li>
            <li>
              <span className="font-semibold text-gray-900">Import from Figma</span> (⋯ menu, when allowed) — Connects with a Figma personal access token and file,
              lists variable collections in that file, and imports a chosen set into this app as collection data. You typically name the new or updated collection
              in the wizard.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Export to Figma</span> (⋯ menu, when allowed) — Takes the token set you are viewing and pushes it into
              Figma variables: you supply token, file, and target collection in the dialog so the correct file receives updates.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Import from GitHub</span> / <span className="font-semibold text-gray-900">Push to GitHub</span>{' '}
              (⋯ menu, when allowed) — Reads or writes token files in a Git repository using your GitHub credentials and chosen branch/path. A directory picker
              helps select the folder. Finish in the UI to confirm the operation succeeded.
            </li>
          </ul>
          <p className="text-xs leading-relaxed text-gray-700 ml-1 border-l-2 border-gray-200 pl-3">
            GitHub and Figma entries only appear when your role includes those integrations. If an action says configuration is missing, connect tokens and
            repository details in the dialog (or ask an admin) before retrying.
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Toolbar and ⋯ menu (quick map)</h4>
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
          <h4 className="text-base font-bold text-gray-900">Token types you can choose</h4>
          <p className="text-xs leading-relaxed text-gray-800 ml-1">
            Available types include: color, dimension, fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, borderRadius, borderWidth, opacity, boxShadow,
            textShadow, duration, cubicBezier, number, string, strokeStyle, border, transition, shadow, gradient, typography.
          </p>
          <div className="grid grid-cols-1 gap-4 text-xs leading-relaxed text-gray-800 md:grid-cols-2 md:gap-6">
            <div className="space-y-2">
              <p><span className="font-semibold text-gray-900">color:</span> #ff0000, rgb(255,0,0), hsl(0,100%,50%)</p>
              <p><span className="font-semibold text-gray-900">dimension:</span> 16px, 1rem, 8pt</p>
              <p><span className="font-semibold text-gray-900">fontFamily:</span> [&quot;Arial&quot;, &quot;sans-serif&quot;]</p>
              <p><span className="font-semibold text-gray-900">fontWeight:</span> 400, &quot;normal&quot;, &quot;bold&quot;</p>
              <p><span className="font-semibold text-gray-900">duration:</span> 200ms, 0.2s</p>
              <p><span className="font-semibold text-gray-900">cubicBezier:</span> [0.25, 0.1, 0.25, 1]</p>
              <p><span className="font-semibold text-gray-900">number, string, opacity:</span> use literals your type expects</p>
            </div>
            <div className="space-y-2">
              <p><span className="font-semibold text-gray-900">strokeStyle, border:</span> JSON objects with width, style, dashes, or color fields</p>
              <p><span className="font-semibold text-gray-900">shadow, boxShadow, textShadow:</span> offset, blur, spread, color</p>
              <p><span className="font-semibold text-gray-900">gradient:</span> type plus color stops</p>
              <p><span className="font-semibold text-gray-900">typography, transition:</span> composite objects (several properties in one value)</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-base font-bold text-gray-900">Tips before you go</h4>
          <ul className="list-disc list-outside space-y-2 ml-5 leading-relaxed">
            <li>Start with clear, semantic paths like <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-900">color.semantic.success</code> so libraries scale.</li>
            <li>Short descriptions and attributes help the next person (or future you) know when to use a token.</li>
            <li>After a long editing session, Save once more before you close the tab so the server copy matches what you see.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
