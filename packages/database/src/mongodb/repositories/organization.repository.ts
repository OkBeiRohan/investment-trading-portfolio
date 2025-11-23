import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, QueryFilter } from "mongoose";
import { Invitation, Member, Organization } from "../schemas/organization";

@Injectable()
export class OrganizationRepository {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<Organization>,
    @InjectModel(Member.name) private readonly memberModel: Model<Member>,
    @InjectModel(Invitation.name)
    private readonly invitationModel: Model<Invitation>
  ) {}

  // Organization methods
  async createOrganization(data: Partial<Organization>): Promise<Organization> {
    const org = new this.orgModel(data);
    return org.save();
  }

  async findOrganizationById(id: string): Promise<Organization | null> {
    return this.orgModel.findById(id).exec();
  }

  async findOrganizationBySlug(slug: string): Promise<Organization | null> {
    return this.orgModel.findOne({ slug }).exec();
  }

  async findOrganizations(
    filter: QueryFilter<Organization>
  ): Promise<Organization[]> {
    return this.orgModel.find(filter).exec();
  }

  async updateOrganization(
    id: string,
    data: Partial<Organization>
  ): Promise<Organization | null> {
    return this.orgModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deleteOrganization(id: string): Promise<boolean> {
    const result = await this.orgModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  // Member methods
  async createMember(data: Partial<Member>): Promise<Member> {
    const member = new this.memberModel(data);
    return member.save();
  }

  async findMember(filter: QueryFilter<Member>): Promise<Member | null> {
    return this.memberModel.findOne(filter).populate("userId").exec();
  }

  async findMembers(filter: QueryFilter<Member>): Promise<Member[]> {
    return this.memberModel.find(filter).populate("userId").exec();
  }

  async updateMember(
    id: string,
    data: Partial<Member>
  ): Promise<Member | null> {
    return this.memberModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deleteMember(id: string): Promise<boolean> {
    const result = await this.memberModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async deleteMembersByOrg(organizationId: string): Promise<number> {
    const result = await this.memberModel.deleteMany({ organizationId }).exec();
    return result.deletedCount;
  }

  // Invitation methods
  async createInvitation(data: Partial<Invitation>): Promise<Invitation> {
    const invitation = new this.invitationModel(data);
    return invitation.save();
  }

  async findInvitation(
    filter: QueryFilter<Invitation>
  ): Promise<Invitation | null> {
    return this.invitationModel.findOne(filter).exec();
  }

  async findInvitations(
    filter: QueryFilter<Invitation>
  ): Promise<Invitation[]> {
    return this.invitationModel.find(filter).exec();
  }

  async updateInvitation(
    id: string,
    data: Partial<Invitation>
  ): Promise<Invitation | null> {
    return this.invitationModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async deleteInvitation(id: string): Promise<boolean> {
    const result = await this.invitationModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.invitationModel
      .deleteMany({
        expiresAt: { $lt: new Date() },
        status: "pending",
      })
      .exec();
    return result.deletedCount;
  }
}
