/**
 * Генератор файлового каталога пользователей для локальной разработки и тестов.
 *
 * Пароли сохраняются в виде scrypt-хешей — открытых паролей в файле нет.
 * Такой каталог допустим только при NODE_ENV != production: сервер откажется
 * стартовать, если AUTH_DEV_DIRECTORY_FILE задан в production.
 *
 * Использование:
 *   npm run dev:directory -- i.ivanov@colvir.com Пароль123 [--admin] [--file ./dev-directory.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { FileDirectory } from '../server/auth/directory.js';

interface DirectoryUser {
  upn: string;
  samAccountName: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department: string;
  title: string;
  company: string;
  memberOf: string[];
  passwordHash: string;
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let file = './dev-directory.json';
  let admin = false;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--admin') {
      admin = true;
    } else if (argv[i] === '--file') {
      file = argv[i + 1] ?? file;
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }

  return { upn: positional[0], password: positional[1], file, admin };
}

function main(): void {
  const { upn, password, file, admin } = parseArgs(process.argv.slice(2));

  if (!upn || !password) {
    console.error(
      'Использование: npm run dev:directory -- <upn@colvir.com> <пароль> [--admin] [--file путь]'
    );
    process.exit(1);
  }

  const filePath = path.resolve(file);
  let users: DirectoryUser[] = [];
  if (fs.existsSync(filePath)) {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    users = Array.isArray(parsed) ? parsed : (parsed.users ?? []);
  }

  const sam = upn.split('@')[0];
  const [first = 'Иван', last = 'Иванов'] = sam.split('.');
  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  const user: DirectoryUser = {
    upn: upn.toLowerCase(),
    samAccountName: sam,
    email: upn.toLowerCase(),
    firstName: capitalize(first),
    lastName: capitalize(last),
    displayName: `${capitalize(last)} ${capitalize(first)}`,
    department: 'Департамент разработки',
    title: 'Специалист',
    company: 'Colvir Software Solutions',
    memberOf: [
      'CN=Colvir-Employees,OU=Groups,DC=colvir,DC=com',
      ...(admin ? ['CN=Colvir-Event-Managers,OU=Groups,DC=colvir,DC=com'] : [])
    ],
    passwordHash: FileDirectory.hashPassword(password)
  };

  users = users.filter((existing) => existing.upn.toLowerCase() !== user.upn);
  users.push(user);

  fs.writeFileSync(filePath, JSON.stringify(users, null, 2) + '\n', { mode: 0o600 });
  console.log(
    `Учётная запись ${user.upn} сохранена в ${filePath}` + (admin ? ' (администратор)' : '')
  );
}

main();
