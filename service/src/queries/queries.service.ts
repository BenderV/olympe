import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Prediction, Query } from './queries.entity';
import * as _ from 'lodash';

export interface QueryApi {
  id: number;
  databaseId: number;
  query: string;
  sql: string;
  comment: string;
  validated: boolean;
}
@Injectable()
export class QueriesService {
  constructor(
    @InjectRepository(Query)
    private queriesRepository: Repository<Query>,

    @InjectRepository(Prediction)
    private predictionRepository: Repository<Prediction>,
  ) {}

  async readPredictionCache({ modelName, prompt }): Promise<string | null> {
    const cache = await this.predictionRepository.findOne({
      where: {
        modelName,
        prompt,
      },
    });
    return cache?.value;
  }

  async writePredictionCache({
    openAIResponse,
    query,
    modelName,
    prompt,
    output,
    value,
  }) {
    this.predictionRepository.save({
      openAIResponse,
      query,
      modelName,
      prompt,
      output,
      value,
    });
  }

  find(): Promise<Query[]> {
    return this.queriesRepository.find();
  }

  async findOne(id: number): Promise<QueryApi> {
    const query = await this.queriesRepository.findOne(id, {
      relations: ['predictions'],
    });

    // Generate prompt ....
    // Or we should tag about was the prediction about...
    const lastPrediction = _.maxBy(query.predictions, (o) => {
      return o.id;
    });

    const sql = query.validatedSQL || lastPrediction?.output;

    return {
      id: query.id,
      databaseId: query.databaseId,
      query: query.query,
      comment: query.comment,
      sql: sql,
      validated: query.validatedSQL ? true : false,
    };
  }

  findByQuery(databaseId: number, query: string): Promise<Query> {
    return this.queriesRepository.findOne({
      where: {
        databaseId,
        query,
      },
    });
  }

  async create({ query, databaseId, creator }): Promise<Query> {
    return await this.queriesRepository.save({
      creator,
      databaseId,
      query,
    });
  }

  async validate(id: number, sqlQuery: string): Promise<Query> {
    const query = await this.queriesRepository.findOne(id);
    query.validatedSQL = sqlQuery;
    return await this.queriesRepository.save(query);
  }

  async getValidatedQueriesExamplesOnDatabase(
    databaseId: number,
    query: string,
  ): Promise<Query[]> {
    return await this.queriesRepository.find({
      where: {
        validatedSQL: Not(IsNull()),
        databaseId,
        query: Not(query),
      },
    });
  }

  async getAllValidatedQueries(): Promise<Query[]> {
    return await this.queriesRepository.find({
      where: {
        validatedSQL: Not(IsNull()),
      },
    });
  }
}
