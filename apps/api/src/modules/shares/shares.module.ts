import { Module } from "@nestjs/common";
import { PrismaService } from "../../lib/prisma.service.js";
import { SharesController } from "./shares.controller.js";
import { SharesService } from "./shares.service.js";

@Module({
  controllers: [SharesController],
  providers: [SharesService, PrismaService],
  exports: [SharesService],
})
export class SharesModule {}
