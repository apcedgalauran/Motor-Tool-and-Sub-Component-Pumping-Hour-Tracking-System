const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const motors = await prisma.motor.findMany({
      where: {
        serialNumber: {
          contains: '7008',
          mode: 'insensitive'
        }
      }
    })
    console.log("Motors:", motors)
  } catch(e) {
    console.log("Error:", e.message)
  }
}
main()
