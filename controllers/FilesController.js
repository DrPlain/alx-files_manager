import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { writeFile, mkdir, existsSync } from 'fs';
import { promisify } from 'util';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);

export default class FilesController {
  static async getUserByToken(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve user based on token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return user;
  }

  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve user based on token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve request parameters
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    // Validate request paramenters
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedTypes = ['folder', 'file', 'image'];

    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (parentId) {
      const existingParentIdFile = await dbClient.filesCollection.findOne(
        { _id: ObjectId(parentId) },
      );
      if (!existingParentIdFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (existingParentIdFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Create a new new folder object
    const newFolder = {
      name,
      type,
      parentId: parentId || 0,
      isPublic: isPublic || false,
      userId: ObjectId(userId),
    };
    if (parentId) newFolder.parentId = ObjectId(parentId);

    if (type === 'folder') {
      const result = await dbClient.filesCollection.insertOne(newFolder);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
      });
    }

    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileDataBase64 = Buffer.from(data, 'base64');
    const fileName = uuidv4();
    const filePath = path.join(FOLDER_PATH, fileName);

    try {
      if (!existsSync(FOLDER_PATH)) {
        // The recursive option ensures that the directory and
      //   necessary parent directories are created recursively
        await mkdirAsync(FOLDER_PATH, { recursive: true });
      }
      await writeFileAsync(filePath, fileDataBase64);
    } catch (error) {
      console.log(error.message);
    }

    const newFile = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || 0,
      localPath: filePath,
    };
    if (parentId) newFile.parentId = ObjectId(parentId);
    const result = await dbClient.filesCollection.insertOne(newFile);
    const fileId = result.insertedId;
    return res.status(201).json({
      id: fileId,
      userId,
      name,
      isPublic: isPublic || false,
      parentId: parentId || 0,
    });
  }

  static async getShow(req, res) {
    const { id } = req.params;
    if (!id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Retrieve user by token
    const user = await FilesController.getUserByToken(req, res);

    // Retrieve files attached to userId
    const files = await dbClient.filesCollection.findOne({
      userId: user._id,
      _id: ObjectId(id),
    });
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Format keys from _id to id
    const { _id, ...rest } = files;
    const editedFiles = { id: _id, ...rest };
    console.log(editedFiles);
    return res.status(200).json(editedFiles);
  }

  static async getIndex(req, res) {
    const user = await FilesController.getUserByToken(req, res);
    const { parentId, page = 0 } = req.query;
    const pageSize = 20;
    const searchParam = {
      userId: user._id,
      parentId: 0,
    };
    if (parentId) {
      searchParam.parentId = ObjectId(parentId);
    }
    const files = await dbClient.filesCollection.find(searchParam)
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();

    // Format keys from _id to id
    const editedFiles = files.map((obj) => {
      const { _id, ...rest } = obj;
      return { id: _id, ...rest };
    });
    console.log(editedFiles);
    return res.status(200).json(editedFiles);
  }
}
