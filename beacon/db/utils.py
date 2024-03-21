from typing import Dict, Optional

from pymongo.cursor import Cursor
from pymongo.collection import Collection

import logging

LOG = logging.getLogger(__name__)


def query_id(query: dict, document_id) -> dict:
    query["id"] = document_id
    return query


def query_ids(query: dict, ids) -> dict:
    query["id"] = ids
    return query


def query_property(query: dict, property_id: str, value: str, property_map: Dict[str, str]) -> dict:
    query[property_map[property_id]] = value
    return query


def get_count(collection: Collection, query: dict) -> int:
    if not query:
        LOG.debug("Returning estimated count")
        return collection.estimated_document_count()
    else:
        LOG.debug("QUERYYYYYYY ISSSSSSSSSSSSSSSSSSSSSSSSSS ")
        LOG.debug(collection)
        LOG.debug("Returning count")
        #del query['$and']
        #query['$or'] = [{'$or': [{'diseases.diseaseCode.label': {'$regex': 'acute'}}]}, {'$or': [{'diseases.diseaseCode.label': 'iron deficiency anaemia'}]}]
        LOG.debug("FINAL QUERY (COUNT): {}".format(query))
        return collection.count_documents(query)


def get_documents(collection: Collection, query: dict, skip: int, limit: int) -> Cursor:
    #LOG.debug("FINAL QUERY: {}".format(query))
    LOG.debug(skip)
    return collection.find(query).skip(skip).limit(limit).max_time_ms(10 * 1000)

def get_filtering_documents(collection: Collection, query: dict, remove_id: dict,skip: int, limit: int) -> Cursor:
    #LOG.debug("FINAL QUERY: {}".format(query))
    return collection.find(query,remove_id).skip(skip).limit(limit).max_time_ms(10 * 1000)

def get_cross_query(ids: dict, cross_type: str, collection_id: str):
    id_list=[]
    dict_in={}
    id_dict={}
    if cross_type == 'biosampleId' or cross_type=='id':
        list_item=ids
        LOG.debug(str(list_item))
        id_list.append(str(list_item))
        dict_in["$in"]=id_list
        LOG.debug(id_list)
        id_dict[collection_id]=dict_in
        query = id_dict
    elif cross_type == 'individualIds' or cross_type=='biosampleIds':
        list_individualIds=ids
        dict_in["$in"]=list_individualIds
        LOG.debug(list_individualIds)
        id_dict[collection_id]=dict_in
        query = id_dict
    else:
        for k, v in ids.items():
            for item in v:
                id_list.append(item[cross_type])
        dict_in["$in"]=id_list
        id_dict[collection_id]=dict_in
        query = id_dict


    LOG.debug(query)
    return query

def get_cross_query_variants(ids: dict, cross_type: str, collection_id: str):
    id_list=[]
    dict_in={}
    id_dict={}
    for k, v in ids.items():
        for item in v:
            id_list.append(item[cross_type])
    dict_in["$in"]=id_list
    id_dict[collection_id]=dict_in
    query = id_dict


    LOG.debug(query)
    return query

def join_query(collection: Collection,query: dict, original_id):
    #LOG.debug(query)
    excluding_fields={"_id": 0, original_id: 1}
    return collection.find(query, excluding_fields).max_time_ms(100 * 1000)

def id_to_biosampleId(collection: Collection,query: dict, original_id):
    #LOG.debug(query)
    excluding_fields={"_id": 0, original_id: 1}
    return collection.find(query, excluding_fields).max_time_ms(100 * 1000)

def get_docs_by_response_type(include: str, query: dict, datasets_dict: dict, dataset: str, limit: int, skip: int, mongo_collection, idq: str):
    if include == 'MISS':
        count = 0
        query_count=query
        i=1
        for k, v in datasets_dict.items():
            query_count["$or"]=[]
            if k == dataset:
                for id in v:
                    if i < len(v):
                        queryid={}
                        queryid[idq]=id
                        query_count["$or"].append(queryid)
                        i+=1
                    else:
                        queryid={}
                        queryid[idq]=id
                        query_count["$or"].append(queryid)
                        i=1
                if query_count["$or"]!=[]:
                    dataset_count = get_count(mongo_collection, query_count)
                    if limit == 0 or dataset_count < limit:
                        pass
                    else:
                        dataset_count = limit
                    if dataset_count !=0:
                        return count, -1, None
                    #LOG.debug(dataset_count)
                    docs = get_documents(
                        mongo_collection,
                        query_count,
                        skip*limit,
                        limit
                    )
                else:
                    dataset_count=0
    elif include == 'NONE':
        count = get_count(mongo_collection, query)
        dataset_count=0
        docs = get_documents(
        mongo_collection,
        query,
        skip*limit,
        limit
        )
    elif include == 'HIT':
        count=0
        #LOG.debug(query)
        #LOG.debug(count)
        query_count=query
        i=1
        query_count["$or"]=[]
        for k, v in datasets_dict.items():
            if k == dataset:
                for id in v:
                    if i < len(v):
                        queryid={}
                        queryid[idq]=id
                        query_count["$or"].append(queryid)
                        i+=1
                    else:
                        queryid={}
                        queryid[idq]=id
                        query_count["$or"].append(queryid)
                        i=1
                if query_count["$or"]!=[]:
                    #LOG.debug(query_count)
                    dataset_count = get_count(mongo_collection, query)
                    #LOG.debug(dataset_count)
                    #LOG.debug(limit)
                    docs = get_documents(
                        mongo_collection,
                        query_count,
                        skip*limit,
                        limit
                    )
                else:
                    dataset_count=0
        if dataset_count==0:
            return count, -1, None
    elif include == 'ALL':
        count=0
        query_count=query
        i=1
        query_count["$or"]=[]
        for k, v in datasets_dict.items():
            if k == dataset:
                for id in v:
                    if i < len(v):
                        queryid={}
                        queryid[idq]=id
                        query_count["$or"].append(queryid)
                        i+=1
                    else:
                        queryid={}
                        queryid[idq]=id
                        query_count["$or"].append(queryid)
                        i=1
                if query_count["$or"]!=[]:
                    dataset_count = get_count(mongo_collection, query_count)
                    #LOG.debug(dataset_count)
                    docs = get_documents(
                        mongo_collection,
                        query_count,
                        skip*limit,
                        limit
                    )
                else:
                    dataset_count=0
    return count, dataset_count, docs