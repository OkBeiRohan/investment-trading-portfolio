import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ISegmentFundMargin } from "@repo/schema";

@Schema({ _id: false })
export class SegmentFundMargin implements ISegmentFundMargin {
  @Prop({ required: true })
  used_margin: number;

  @Prop({ required: true })
  payin_amount: number;

  @Prop({ required: true })
  span_margin: number;

  @Prop({ required: true })
  adhoc_margin: number;

  @Prop({ required: true })
  notional_cash: number;

  @Prop({ required: true })
  available_margin: number;

  @Prop({ required: true })
  exposure_margin: number;
}

export const SegmentFundMarginSchema =
  SchemaFactory.createForClass(SegmentFundMargin);
