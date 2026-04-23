import { db } from "../../plugins/db";
import { hashPassword, verifyPassword } from "../../utils/password"

type UserDTO = {
    id: string;
    email: string;
    role: string;
    createdAt: string;
};

export async function registerUser(email: string, password: string) {
    const emailLower = email.toLowerCase()
    const passwordHash = await hashPassword(password)
    try {
        const rows = await db`
        insert into users (email, password_hash)
        values (${emailLower}, ${passwordHash})
        returning id, email, role, created_at
        `;
        if (rows.length === 0) throw new Error("Insert succeeded but returned no rows");
        const user = rows[0] as { id: string; email: string; role: string; created_at: Date | string };

        const createdAt =
            typeof user.created_at === "string" ? user.created_at : user.created_at.toISOString();

        return { id: user.id, email: user.email, role: user.role, createdAt };
    } catch (error) {
        const err = error as { code?: string }
        if (err.code === "23505") throw new EmailAlreadyExistsError()
        throw error;
    }
}

export async function loginUser(email: string, password: string) {
    const emailLower = email.toLowerCase()
    const rows = await db`
        select id, email, role, created_at, password_hash
        from users
        where lower(email) = ${emailLower}
        limit 1
    `;

    if (rows.length === 0) return null;

    const user = rows[0] as {
        id: string;
        email: string;
        role: string;
        created_at: Date | string;
        password_hash: string;
    };

    const ok = await verifyPassword(user.password_hash, password);
    if (!ok) return null;

    const createdAt =
        typeof user.created_at === "string" ? user.created_at : user.created_at.toISOString();

    const dto: UserDTO = { id: user.id, email: user.email, role: user.role, createdAt };
    return dto;
}

export async function getUserById(id: string) {
    const rows = await db`
    select id,email,role,created_at
    from users
    where id = ${id}
    limit 1
    `
    if (rows.length === 0) return null;
    const u = rows[0] as UserDTO
    return u;
}

export class EmailAlreadyExistsError extends Error { }