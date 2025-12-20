import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { IBrokerAccountFundMargin } from "@repo/schema";
import {
  SegmentFundMargin,
  SegmentFundMarginSchema,
} from "./segment-fund-margin.schema";

@Schema({ _id: false })
export class BrokerAccountFundMargin implements IBrokerAccountFundMargin {
  @Prop({ type: SegmentFundMarginSchema, required: true })
  equity: SegmentFundMargin;

  @Prop({ type: SegmentFundMarginSchema, required: true })
  commodity: SegmentFundMargin;
}

export const BrokerAccountFundMarginSchema = SchemaFactory.createForClass(
  BrokerAccountFundMargin
);
