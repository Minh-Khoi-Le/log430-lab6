export class User {
  id: number;
  name: string;
  role: string;
  password: string;

  constructor(id: number, name: string, role: string = 'client', password: string = 'password') {
    this.id = id;
    this.name = name;
    this.role = role;
    this.password = password;
  }
}