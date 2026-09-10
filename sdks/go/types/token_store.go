package types

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type storedToken struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expires_at"`
	IV        string `json:"iv"`
	Tag       string `json:"tag"`
}

type EncryptedTokenStore struct {
	filePath string
	key      []byte
}

func NewEncryptedTokenStore(filePath, encryptionKey string) *EncryptedTokenStore {
	key := []byte(encryptionKey)
	if len(key) < 32 {
		padded := make([]byte, 32)
		copy(padded, key)
		for i := len(key); i < 32; i++ {
			padded[i] = 'x'
		}
		key = padded
	}
	return &EncryptedTokenStore{filePath: filePath, key: key[:32]}
}

func (s *EncryptedTokenStore) Save(token string, expiresAt time.Time) error {
	iv := make([]byte, 12)
	if _, err := rand.Read(iv); err != nil {
		return err
	}

	block, err := aes.NewCipher(s.key)
	if err != nil {
		return err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}

	encrypted := aesgcm.Seal(nil, iv, []byte(token), nil)

	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}

	data := storedToken{
		Token:     base64.StdEncoding.EncodeToString(encrypted),
		ExpiresAt: expiresAt.UTC().Format(time.RFC3339),
		IV:        base64.StdEncoding.EncodeToString(iv),
		Tag:       "",
	}

	raw, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, raw, 0600)
}

func (s *EncryptedTokenStore) Load() (string, time.Time, error) {
	raw, err := os.ReadFile(s.filePath)
	if err != nil {
		return "", time.Time{}, err
	}

	var data storedToken
	if err := json.Unmarshal(raw, &data); err != nil {
		return "", time.Time{}, err
	}

	block, err := aes.NewCipher(s.key)
	if err != nil {
		return "", time.Time{}, err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", time.Time{}, err
	}

	iv, err := base64.StdEncoding.DecodeString(data.IV)
	if err != nil {
		return "", time.Time{}, err
	}
	encrypted, err := base64.StdEncoding.DecodeString(data.Token)
	if err != nil {
		return "", time.Time{}, err
	}
	decrypted, err := aesgcm.Open(nil, iv, encrypted, nil)
	if err != nil {
		return "", time.Time{}, err
	}

	expiresAt, err := time.Parse(time.RFC3339, data.ExpiresAt)
	if err != nil {
		return "", time.Time{}, err
	}

	return string(decrypted), expiresAt, nil
}

func (s *EncryptedTokenStore) Clear() error {
	return os.Remove(s.filePath)
}
