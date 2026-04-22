import { hash, verify } from "argon2";

export async function hashPassword(password: string): Promise<string> {
    return await hash(password, {
        hashLength: 10,
    })

}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    return await verify(hash, password);
}