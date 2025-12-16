import { ChildEntity } from "typeorm";
import { User } from "./user.entity";
import { Role } from "../enums/role.enum";

@ChildEntity(Role.SECRETARY)
export class Secretary extends User{}
