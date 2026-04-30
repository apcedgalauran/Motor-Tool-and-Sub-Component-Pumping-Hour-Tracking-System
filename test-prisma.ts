import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    const q = '7008'
    const motors = await prisma.motor.findMany({
      where: {
        serialNumber: {
          contains: q,
          mode: 'insensitive' as const,
        }
      }
    })
    console.log("Success:", motors.length)
  } catch (e) {
    console.error("Prisma error:", e.message)
  }
}

main()
