import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);

function readArg(name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.log(
    "Usage: node .\\scripts\\homero\\new-form.mjs --name <FormName> --country <cl|pe|co> [--force]"
  );
}

const name = readArg("--name");
const country = readArg("--country");
const force = hasFlag("--force");

if (!name || !country || hasFlag("--help")) {
  usage();
  process.exit(name && country ? 0 : 1);
}

const configPath = path.resolve(process.cwd(), "homero.config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const uiRoot = config.paths?.uiRoot || "src/ui";
const testRoot = config.paths?.testRoot || "test";
const formDir = path.resolve(process.cwd(), uiRoot, country, name);

// Mirror the form path under testRoot, e.g. src/ui/cl/Name -> test/ui/cl/Name
const uiRootRelative = uiRoot.replace(/^src[\\/]/, "");
const testDir = path.resolve(process.cwd(), testRoot, uiRootRelative, country, name);
const testImportSpecifier = path.relative(testDir, formDir).split(path.sep).join("/");

fs.mkdirSync(formDir, { recursive: true });
fs.mkdirSync(testDir, { recursive: true });

const typeName = `${name}Values`;
const hookName = `use${name}`;

const files = [
  {
    path: path.join(formDir, "schema.ts"),
    content: `import { z } from "zod";

export const schema = z.object({
  sampleField: z.string().min(1, "Este campo es requerido")
});

export type ${typeName} = z.infer<typeof schema>;
`
  },
  {
    path: path.join(formDir, `${hookName}.ts`),
    content: `import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { schema, type ${typeName} } from "./schema";

export function ${hookName}() {
  return useForm<${typeName}>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      sampleField: ""
    }
  });
}
`
  },
  {
    path: path.join(formDir, "index.tsx"),
    content: `import { Controller } from "react-hook-form";
import { Button, Input } from "tomaco-components";
import { ${hookName} } from "./${hookName}";

export default function ${name}() {
  const {
    control,
    handleSubmit
  } = ${hookName}();

  const onSubmit = handleSubmit((values) => {
    console.log("${name} submit", values);
  });

  return (
    <form onSubmit={onSubmit}>
      <Controller
        control={control}
        name="sampleField"
        render={({ field }) => <Input {...field} />}
      />
      <Button type="submit">Continuar</Button>
    </form>
  );
}
`
  },
  {
    path: path.join(testDir, `${name}.test.tsx`),
    content: `import { render, screen } from "@testing-library/react";
import ${name} from "${testImportSpecifier}";

describe("${name}", () => {
  it("renders the form shell", () => {
    render(<${name} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
`
  }
];

let created = 0;
let skipped = 0;

for (const file of files) {
  if (!force && fs.existsSync(file.path)) {
    skipped += 1;
    console.log(`SKIP ${file.path}`);
    continue;
  }

  fs.writeFileSync(file.path, file.content, "utf8");
  created += 1;
  console.log(`WRITE ${file.path}`);
}

console.log("");
console.log(`${name} scaffold complete`);
console.log(`Created: ${created}`);
console.log(`Skipped: ${skipped}`);
console.log("Replace sampleField and scaffold placeholders before closing the task.");
