import { writeFile, readdir } from 'fs/promises';

import oldClasses from './data/oldClasses.json' with { type: 'json' };

const data = (
  await import(`./data/mappings/${process.argv[2]}.json`, {
    with: { type: 'json' },
  })
).default;

const { map } = data;

let classes = {};
let classesStub = {};

let skip = ['appDetailsHeaderClasses', 'gamepadUIClasses', 'gamepadTabbedPageClasses', 'gamepadContextMenuClasses'];

for (let classModName in oldClasses) {
  if (skip.includes(classModName)) continue;
  const classMod = oldClasses[classModName];
  classes[classModName] = {};
  classesStub[classModName] = {};
  for (let className in classMod) {
    const oldClass = classMod[className];
    const newClass = map[oldClass];
    if (newClass) {
      console.log(`${className} -> ${newClass}`);
      classes[classModName][className] = newClass;
      classesStub[classModName][className] = '';
    } else {
      console.log(`${className}: not found`);
    }
  }
}

const classString = JSON.stringify(classes, null, 2);
await writeFile('./generated.json', classString);

let fileStr = '// GENERATED FILE DO NOT EDIT\n';
for (let classModName in classes) {
  fileStr += `export const ${classModName} = ${JSON.stringify(classes[classModName], null, 2)};\n\n`;
}

await writeFile(`../src/utils/classData/${process.argv[2]}.ts`, fileStr);

const dir = await readdir("../src/utils/classData");
const versions = dir.filter(f => f != "index.ts").map(f => parseInt(f.replace(".ts", "")));
console.log("Supported:", versions)

let importerStr = `// GENERATED FILE DO NOT EDIT
declare global {
  interface Window {
    CLSTAMP: string;
  }
}
`;

for (let classModName in classesStub) {
  importerStr += `export let ${classModName} = ${JSON.stringify(classesStub[classModName], null, 2)};\n\n`;
}

importerStr += `
const data = await import(\`./\${window.CLSTAMP}.ts\`);
`;

for (let classModName in classesStub) {
  importerStr += `${classModName} = data["${classModName}"];\n`;
}

await writeFile(`../src/utils/classData/index.ts`, importerStr);